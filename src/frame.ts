/**
 * Output looks like this:
 * { frame: undefined,
    media_type: 'video',
    stream_index: '0',
    key_frame: '1',
    pkt_pts: '13258500',
    pkt_pts_time: '147.316667',
    pkt_dts: '13258500',
    pkt_dts_time: '147.316667',
    best_effort_timestamp: '13258500',
    best_effort_timestamp_time: '147.316667',
    pkt_duration: '3750',
    pkt_duration_time: '0.041667',
    pkt_pos: '7831704',
    pkt_size: '27179',
    width: '360',
    height: '240',
    pix_fmt: 'yuv420p',
    sample_aspect_ratio: '1:1',
    pict_type: 'I',
    coded_picture_number: '3500',
    display_picture_number: '0',
    interlaced_frame: '0',
    top_field_first: '0',
    repeat_pict: '0',
    color_range: 'unknown',
    color_space: 'unknown',
    color_primaries: 'unknown',
    color_transfer: 'unknown',
    chroma_location: 'left' }
    */

export class Frame {
  public packetTime: number;
  public packetPosition: number;
  public packetSize: number;
  public rawData: any;
  public packetDurationTime: number;
  public estimatedFrameRate: number;

  protected groupDuration: number | null = null;

  constructor(rawData: any) {
    this.rawData = rawData;
    this.packetTime = parseFloat(rawData.pkt_pts_time);
    this.packetPosition = parseInt(rawData.pkt_pos);
    // According to serveral sources the result of ffprobe is 188 bytes less
    // than that off what Apple recommends, so 188 bytes is somewhat abitrarily added
    this.packetSize = parseInt(rawData.pkt_size) + 188;
    if (rawData.pkt_duration_time > 0) {
      this.packetDurationTime = rawData.pkt_duration_time || 0;
      this.estimatedFrameRate = 1 / rawData.pkt_duration_time;
    } else {
      this.packetDurationTime = 0;
      this.estimatedFrameRate = 0;
    }
  }

  public get isKeyFrame(): boolean {
    return this.rawData.key_frame == 1;
  }

  public setGroupDuration(n: number) {
    this.groupDuration = n;
  }

  public getGroupDuration(): number {
    let duration: number = (this.groupDuration || this.packetDurationTime) * 1;
    return parseFloat(duration.toFixed(5));
  }
}
