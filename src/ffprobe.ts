import { Frame } from "./frame";
import * as execa from "execa";

// Some credits:
// https://open.pbs.org/how-pbs-is-enabling-apples-trick-play-mode-85635372a5db
// https://github.com/pbs/iframe-playlist-generator/blob/master/iframeplaylistgenerator/generator.py
// https://gist.github.com/biomancer/8d139177f520b9dd3495

// biomancer used:
// ffprobe -show_frames -select_streams v -of compact -show_entries packet=pts_time,codec_type,pos:frame=pict_type,pkt_pts_time,pkt_size,pkt_pos -i ${inputFile}
// PBS used this:
// ffprobe -print_format json -show_packets -show_frames ${inputFile}
// Will will use this:
// ffprobe -show_frames -select_streams v -of compact -i ${inputFile} | grep pict_type=I
const cmdPrefix: string =
  "ffprobe -show_frames -select_streams v -of compact -i ";
const cmdSuffix: string = "| grep pict_type=I";

export type KeyValuePair = {
  [key: string]: string;
};

export class FFprobe {
  public iframes: Frame[] = [];

  protected bitRate: number = 1;
  protected width: number = 1280;
  protected height: number = 720;
  protected totalDuration: number = 0;
  protected totalSize: number = 0;

  /**
   * ffprobe -show_frames -select_streams v -of compact -i {url}  | grep pict_type=I
   */
  protected get command(): string {
    return `${cmdPrefix} ${this.url} ${cmdSuffix}`;
  }

  protected get targetDuration(): number {
    let maxDuration: number = 2;
    this.iframes.forEach((frame) => {
      maxDuration = Math.ceil(Math.max(frame.packetDurationTime, maxDuration));
    });
    return maxDuration;
  }

  constructor(public readonly url: string) {}

  public async generateManifest(): Promise<string> {
    await this.execute();
    const m3u8: string[] = [
      "#EXTM3U",
      "#EXT-X-VERSION:4",
      "#EXT-X-ALLOW-CACHE:YES",
      "#EXT-X-MEDIA-SEQUENCE: 0",
      `#EXT-X-TARGETDURATION: ${this.targetDuration}`,
      "#EXT-X-PLAYLIST-TYPE: VOD",
      "#EXT-X-I-FRAMES-ONLY",
    ];
    this.iframes.forEach((frame: Frame) => {
      m3u8.push("#EXTINF:" + frame.getGroupDuration().toFixed(2));
      m3u8.push(
        "#EXT-X-BYTERANGE:" + frame.packetSize + "@" + frame.packetPosition
      );
      m3u8.push("file");
    });
    m3u8.push("#EXT-X-ENDLIST");
    return m3u8.join("\n");
  }

  protected async execute() {
    try {
      const result = await execa.command(this.command);
      this.parse(result.stdout.split("\n"));
    } catch (err) {}
  }

  /**
   * Translate the output into the byte ranges
   *
   * Example line:
   * frame|pkt_pts_time=1.483333|pkt_pos=564|pkt_size=10655|pict_type=I
   *
   * @param lines
   */
  protected parse(lines: string[]) {
    let firstDtsTime: number | null = null;
    let prevFrame: Frame | null = null;
    this.totalDuration = 0;
    this.totalSize = 0;
    lines.forEach((line: string) => {
      // Ignore these types of lines:
      // [https @ 0x7fc08f00f200] Opening '//URL//' for reading
      if (!line.length || line.startsWith("[") || line.includes(" ")) {
        return;
      }
      // Turn this into JSON
      const json: KeyValuePair = {};
      line.split("|").forEach((field: string) => {
        const arr: string[] = field.split("=");
        json[arr[0]] = arr[1];
      });
      const frame = new Frame(json);
      // First timestamp
      if (firstDtsTime === null) {
        firstDtsTime = frame.packetTime;
      }
      // Is this a keyframe?
      if (frame.isKeyFrame) {
        // Add this frame to the array
        this.iframes.push(frame);
        // Update duration of last packet
        if (prevFrame) {
          prevFrame.setGroupDuration(frame.packetTime - prevFrame.packetTime);
          // Temporarily set this current frame to the same as previous... this isn't accurate though
          // We'll set it more for real after
          frame.setGroupDuration(prevFrame.getGroupDuration());
        }
        // Save reference to last iframe
        prevFrame = frame;
      }
    });
    /*
      TODO: Need to have the entire duration of the video to set the duration of the last GOP
    const lastFrame: Frame = this.iframes[this.iframes.length - 1];
    lastFrame.setGroupDuration(
      this.video.getTotalDuration() - lastFrame.packetTime + (firstDtsTime || 0)
    );
    */
    // Loop through the result, because some of the things like duration change along the way
    this.iframes.forEach((frame: Frame) => {
      // Add up totals
      this.totalDuration += frame.getGroupDuration() * 1;
      this.totalSize += frame.packetSize;
    });
  }
}
