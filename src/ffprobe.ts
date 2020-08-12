import { Frame, FFProbeData } from './frame';
import * as execa from 'execa';
import { Chunklist } from './chunklist';
import * as HLS from 'hls-parser';

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
const cmd = 'ffprobe -show_frames -select_streams v -of compact -i ';

export type KeyValuePair = {
  [key: string]: string;
};

export class FFprobe {
  public static async getFrames(
    chunklist: Chunklist,
    segment: HLS.types.Segment,
  ): Promise<Frame[]> {
    return new FFprobe(chunklist, segment).execute();
  }

  public get absoluteUri(): string {
    return new URL(this.segment.uri || '', this.chunklist.absoluteUri).href;
  }

  /**
   * ffprobe -show_frames -select_streams v -of compact -i {url}
   */
  protected get command(): string {
    return `${cmd} ${this.absoluteUri}`;
  }

  private constructor(
    public readonly chunklist: Chunklist,
    public readonly segment: HLS.types.Segment,
  ) {}

  protected async execute(): Promise<Frame[]> {
    const result = await execa.command(this.command);
    return this.parse(result.stdout.split('\n'));
  }

  /**
   * Translate the output into the byte ranges
   *
   * Example line:
   * frame|pkt_pts_time=1.483333|pkt_pos=564|pkt_size=10655|pict_type=I
   *
   * @param lines
   */
  protected parse(lines: string[]): Frame[] {
    return (
      lines
        .filter((line) => line.startsWith('frame'))
        //.filter((line) => !line.includes('pict_type=I'))
        .map((line: string) => {
          // Turn this into JSON
          const frameData: FFProbeData = {};
          line.split('|').forEach((field: string) => {
            const arr: string[] = field.split('=');
            frameData[arr[0]] = arr[1];
          });
          // Return frame
          return new Frame(frameData, this.segment.uri, this.chunklist);
        })
    );
  }
}
