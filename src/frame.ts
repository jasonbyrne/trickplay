import { Chunklist } from './chunklist';

export interface FFProbeData {
  type?: string;
  media_type?: string;
  stream_index?: string;
  key_frame?: '0' | '1';
  pkt_pts?: string;
  pkt_pts_time?: string;
  pkt_dts?: string;
  pkt_dts_time?: string;
  best_effort_timestamp?: string;
  best_effort_timestamp_time?: string;
  pkt_duration?: string;
  pkt_duration_time?: string;
  pkt_pos?: string;
  pkt_size?: string;
  width?: string;
  height?: string;
  pix_fmt?: string;
  sample_aspect_ratio?: string;
  pict_type?: 'P' | 'I' | 'B';
  coded_picture_number?: string;
  display_picture_number?: string;
  interlaced_frame?: string;
  top_field_first?: string;
  repeat_pict?: string;
  color_range?: string;
  color_space?: string;
  color_primaries?: string;
  color_transfer?: string;
  chroma_location?: string;
  codec_type?: string;
  duration?: string;
  duration_time?: string;
  size?: string;
  pos?: string;
  flags?: string;
  side_data_list?: any[];
}

export class Frame {
  public packetTime: number;
  public packetPosition: number;
  public packetSize: number;
  public rawData: any;
  public packetDurationTime: number;
  public estimatedFrameRate: number;

  protected _gopDuration = 0;

  public get absoluteUri(): string {
    return new URL(this._uri, this._chunklist.absoluteUri).href;
  }

  public set gopDuration(value: number) {
    console.log(value);
    if (!(value > 0)) {
      throw 'Group of Pictures duration must be greater than 0.';
    }
    this._gopDuration = value;
  }

  public get gopDuration(): number {
    if (this._gopDuration > 0) {
      return this._gopDuration;
    }
    return this.packetDurationTime * 60; // Assumption of keyframe very 60 frames, which isn't great to assume
  }

  constructor(
    rawData: FFProbeData,
    private _uri: string,
    private _chunklist: Chunklist,
  ) {
    this.rawData = rawData;
    this.packetTime = parseFloat(rawData.pkt_pts_time || '0');
    this.packetPosition = parseInt(rawData.pkt_pos || '0');
    this.setDurationAndFrameRate(Number(rawData.pkt_duration_time));
    // According to serveral sources the result of ffprobe is 188 bytes less
    // than that off what Apple recommends, so 188 bytes is somewhat abitrarily added
    this.packetSize = parseInt(rawData.pkt_size || '0') + 188;
  }

  public get isKeyFrame(): boolean {
    return this.rawData.key_frame == 1;
  }

  private setDurationAndFrameRate(packetDurationTime: number) {
    if (packetDurationTime > 0) {
      this.packetDurationTime = packetDurationTime;
      this.estimatedFrameRate = 1 / packetDurationTime;
    } else {
      this.packetDurationTime = 0;
      this.estimatedFrameRate = 0;
    }
  }
}
