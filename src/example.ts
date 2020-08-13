import { getTrickplayManifests } from '.';

(async () => {
  //const exampleUri =
  //'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,.f4v.csmil/master.m3u8';
  const exampleUri2 =
    'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,.f4v.csmil/master.m3u8';
  const trickplay = await getTrickplayManifests(exampleUri2);
  console.log(trickplay);
})();
