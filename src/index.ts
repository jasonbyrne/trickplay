import { Playlist } from './playlist';

export const getTrickplayManifests = async (uri: string) => {
  const playlist = await Playlist.open(uri);
  const trickplayManifests = await Promise.all(
    playlist.chunklists.map((chunklist) => chunklist.generateManifest()),
  );
  const manifests: { [key: string]: string } = {};
  trickplayManifests.forEach((manifest, i) => {
    manifests[playlist.chunklists[i].uri] = manifest;
  });
  return manifests;
};
