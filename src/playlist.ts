import bent from 'bent';
import * as HLS from 'hls-parser';
import { Chunklist } from './chunklist';

export const getContent = bent('GET', 'string');

export class Playlist {
  public static async open(url: string) {
    const playlist = new Playlist(url, await getContent(url));
    await playlist.loadChunklists();
    return playlist;
  }

  private playlist: HLS.types.MasterPlaylist;

  public chunklists: Chunklist[] = [];

  public get absoluteUri(): string {
    return this.uri;
  }

  private constructor(private uri: string, content: string) {
    const playlist = HLS.parse(content);
    if (!playlist.isMasterPlaylist) {
      throw 'The URL provided is not a master playlist.';
    }
    this.playlist = playlist as HLS.types.MasterPlaylist;
  }

  protected async loadChunklists(): Promise<void> {
    this.chunklists = await Promise.all(
      this.playlist.variants
        // Get only the video renditions
        .filter((variant) => {
          return (
            !variant.isIFrameOnly &&
            (variant.codecs?.includes('avc') ||
              variant.codecs?.includes('hevc'))
          );
        })
        // Sort renditions in descending bandwidth order
        .sort((a, b) => b.bandwidth - a.bandwidth)
        // Create the objects for each
        .map((variant) => {
          // Create this video rendition
          return Chunklist.open(this, variant.uri);
        }),
    );
  }
}
