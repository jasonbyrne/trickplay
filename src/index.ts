import { Playlist } from './playlist';

(async () => {
  //const exampleUri =
  //'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,.f4v.csmil/master.m3u8';
  const exampleUri2 =
    'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,.f4v.csmil/master.m3u8';
  const playlist = await Playlist.open(exampleUri2);
  const trickplayManifests = await Promise.all(
    playlist.chunklists.map((chunklist) => chunklist.generateManifest()),
  );
  trickplayManifests.forEach((manifest) => {
    console.log(manifest);
  });
})();
