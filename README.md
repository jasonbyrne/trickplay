# Trickplay

Generate iframe only renditions from a master playlist.

Usage:

```javascript
const trickplay = await getTrickplayManifests(masterPlaylistUri);
```

This will return a key-value object where the key is the URI of each chunklist in the master playlist. The value will be the string content of the iframe only rendition corresponding with that chunklist.
