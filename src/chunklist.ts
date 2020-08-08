import { Playlist, getContent } from "./playlist";
import * as HLS from "hls-parser";

export class Chunklist {
  public static async open(playlist: Playlist, chunklistUri: string) {
    return new Chunklist(
      playlist,
      chunklistUri,
      await getContent(chunklistUri)
    );
  }

  private chunklist: HLS.types.MediaPlaylist;

  public get segments(): readonly HLS.types.Segment[] {
    return this.chunklist.segments;
  }

  private constructor(
    private playlist: Playlist,
    private chunklistUri: string,
    private chunklistContent: string
  ) {
    const chunklist = HLS.parse(chunklistContent);
    if (chunklist.isMasterPlaylist) {
      throw "This is not a chunklist.";
    }
    this.chunklist = chunklist as HLS.types.MediaPlaylist;
  }
}
