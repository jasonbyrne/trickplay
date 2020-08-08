import bent from "bent";
import * as HLS from "hls-parser";
import { Chunklist } from "./chunklist";

export const getContent = bent("GET", "string");

export class Playlist {
  public static async open(url: string) {
    return new Playlist(await getContent(url));
  }

  private playlist: HLS.types.MasterPlaylist;

  private constructor(content: string) {
    const playlist = HLS.parse(content);
    if (!playlist.isMasterPlaylist) {
      throw "The URL provided is not a master playlist.";
    }
    this.playlist = playlist as HLS.types.MasterPlaylist;
  }

  public async getVideoRenditions(): Promise<Chunklist[]> {
    const videoVariants: Chunklist[] = await Promise.all(
      this.playlist.variants
        // Get only the video renditions
        .filter((variant) => {
          return (
            !variant.isIFrameOnly &&
            (variant.codecs?.includes("avc") ||
              variant.codecs?.includes("hevc"))
          );
        })
        // Sort renditions in descending bandwidth order
        .sort((a, b) => b.bandwidth - a.bandwidth)
        // Create the objects for each
        .map((variant) => {
          // Create this video rendition
          return Chunklist.open(this, variant.uri);
        })
    );
    return videoVariants;
  }
}
