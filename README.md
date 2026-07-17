# Lichess PGN Blog Viewer

[![Continuous Integration](https://github.com/lichess-org/pgn-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/lichess-org/pgn-viewer/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@lichess-org/pgn-viewer)](https://www.npmjs.com/package/@lichess-org/pgn-viewer)

This is a fork of the [PGN viewer widget](https://github.com/lichess-org/pgn-viewer), designed to be embedded in lichess blog pages.

[Simple Demo](https://chessvue.com/lpv/demo/blog.html)

## License

Lichess PGN Viewer is distributed under the **GPL-3.0 license** (or any later version, at your option).
When you use it for your website, your combined work may be distributed only under the GPL.
**You must release your source code** to the users of your website.

Please read more about GPL for JavaScript on [greendrake.info](https://greendrake.info/publications/js-gpl).

## Goals

- Clear, context-aware commentary
- Compact design
- Clickable variation arrows

### Configuration

```js
const lpv = LichessPgnViewer(domElement, {
  pgn: 'e4 c5 Nf3 d6 e5 Nc6 exd6 Qxd6 Nc3 Nf6',
    showCommentary: true, //display contextual commentary box
    mainlineArrow: 'never', 
    //'always' -> show arrows for all moves, 
    //'ifVariation' -> for all moves when a variation exists,
    //'never' -> only for variation move (never the mainline) 
    showVariations: false,  //simplified movelist for blogs
  // ... more Config
});
```

See [all configuration options in the documented source code](https://github.com/JohnChernoff/pgn-blog-viewer/blob/master/src/config.ts#L3).

View more examples in `demo/index.html`

