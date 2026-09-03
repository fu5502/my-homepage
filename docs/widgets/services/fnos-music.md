---
title: fnOS Music
description: fnOS Music (飞牛音乐) Widget Configuration
---

Monitor your [fnOS](https://www.fnnas.com/) Music (飞牛音乐) library and playback status.

### API Token

Obtain your user token by inspecting the `music-token` cookie in your browser while logged into fnOS Music Web interface, or from your fnOS account tokens.

### Allowed Fields

`["songs", "albums", "artists"]`

### Basic Configuration

```yaml
widget:
  type: fnosmusic
  url: http://fnos.local:5666
  key: your-music-token-here
```

### Advanced Configuration

```yaml
widget:
  type: fnosmusic
  url: http://192.168.99.147:5666
  key: 91b52fcc0c1e4bdeaf4c12ae5668c238
  fields: ["songs", "albums", "artists"]
  enableBlocks: true
  enableNowPlaying: true
```

Aliases supported: `fnosmusic`, `fnos-music`, `feiniumusic`.
