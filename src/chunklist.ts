import { Playlist, getContent } from './playlist';
import * as HLS from 'hls-parser';
import { Frame } from './frame';
import { FFprobe } from './ffprobe';

export const flatten = <T>(arr: T[][]): T[] =>
  arr.reduce((acc: T[], val: T[]) => acc.concat(val), []);

export class Chunklist {
  public static async open(playlist: Playlist, chunklistUri: string) {
    const chunklist = new Chunklist(
      playlist,
      chunklistUri,
      await getContent(chunklistUri),
    );
    return chunklist;
  }

  private chunklist: HLS.types.MediaPlaylist;

  public get absoluteUri(): string {
    return new URL(this.chunklistUri, this.playlist.absoluteUri).href;
  }

  public get totalDuration(): number {
    let duration = 0;
    this.segments.forEach((segment) => {
      duration += segment.duration;
    });
    return duration;
  }

  protected get segments(): readonly HLS.types.Segment[] {
    return this.chunklist.segments;
  }

  protected getTargetDuration(iframes: Frame[]): number {
    let maxDuration = 2;
    iframes.forEach((frame) => {
      maxDuration = Math.ceil(Math.max(frame.packetDurationTime, maxDuration));
    });
    return maxDuration;
  }

  private constructor(
    private playlist: Playlist,
    private chunklistUri: string,
    chunklistContent: string,
  ) {
    const chunklist = HLS.parse(chunklistContent);
    if (chunklist.isMasterPlaylist) {
      throw 'This is not a chunklist.';
    }
    this.chunklist = chunklist as HLS.types.MediaPlaylist;
  }

  private getKeyFrames(frames: Frame[]) {
    // Calculate total time
    const totalDuration =
      frames[frames.length - 1].packetTime -
      frames[0].packetTime +
      frames[frames.length - 1].packetDurationTime;
    // Get just the iframes
    const iframes = frames.filter((frame) => frame.isKeyFrame);
    // Now put the GOP duration on each keyframe
    let lastPacketTime = 0;
    iframes.forEach((iframe) => {
      if (lastPacketTime) {
        iframe.gopDuration = iframe.packetTime - lastPacketTime;
      }
      lastPacketTime = iframe.packetTime;
    });
    // Also add the GOP duration to the last keyframe, from the overall duration
    //console.log(`duration = ${totalDuration}`);
    //console.log(`lastPacketTime = ${lastPacketTime}`);
    //console.log(iframes[iframes.length - 1]);
    // TODO: Fix this... coming out to a negative number so had to abs it, which isn't right (maybe just rounding?)
    iframes[iframes.length - 1].gopDuration = Math.abs(
      totalDuration - lastPacketTime,
    );
    // Done!
    return iframes;
  }

  public async generateManifest(): Promise<string> {
    const result = await Promise.all(
      this.segments.map(async (segment) => {
        return await FFprobe.getFrames(this, segment);
      }),
    );
    const frames = flatten<Frame>(result);
    const keyFrames = this.getKeyFrames(frames);
    // Generate manifest
    const m3u8: string[] = [
      '#EXTM3U',
      '#EXT-X-VERSION:4',
      '#EXT-X-ALLOW-CACHE:YES',
      '#EXT-X-MEDIA-SEQUENCE: 0',
      `#EXT-X-TARGETDURATION: ${this.getTargetDuration(keyFrames)}`,
      '#EXT-X-PLAYLIST-TYPE: VOD',
      '#EXT-X-I-FRAMES-ONLY',
    ];
    keyFrames.forEach((frame: Frame) => {
      m3u8.push('#EXTINF:' + frame.gopDuration.toFixed(2));
      m3u8.push(
        '#EXT-X-BYTERANGE:' + frame.packetSize + '@' + frame.packetPosition,
      );
      m3u8.push(frame.absoluteUri);
    });
    m3u8.push('#EXT-X-ENDLIST');
    return m3u8.join('\n');
  }
}
