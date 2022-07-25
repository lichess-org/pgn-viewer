# Lichess PGN Viewer - work in progress

Minimalistic PGN viewer widget, designed to be embedded in content pages.

This won't replace a fully featured [analysis board](https://lichess.org/analysis).

![board with move variation tree](https://raw.githubusercontent.com/lichess-org/pgn-viewer/master/screenshot/tree-comment.png)

## License

Lichess PGN Viewer is distributed under the **GPL-3.0 license** (or any later version, at your option).
When you use it for your website, your combined work may be distributed only under the GPL.
**You must release your source code** to the users of your website.

Please read more about GPL for JavaScript on [greendrake.info](https://greendrake.info/publications/js-gpl).

## Goals

- load and render very fast
- browse through a game
- variation tree
- PGN comments
- mobile support
- translatable and customisable
- client-side only
- easy to set up on any page

### Non Goals

- custom user moves
- engine support
- opening explorer

For these features, use an [analysis board](https://lichess.org/analysis) or [Lichess studies](https://lichess.org/study).

## Build and run

```
npm install
npm run sass-dev
npm run dev
npm run demo
```

Then run the demos in your browser.

### Rebuild on code change

```
npm run watch
```

## Installation

### As an NPM package

```
npm i lichess-pgn-viewer
```

## Usage

```js
import LichessPgnViewer from 'lichess-pgn-viewer';

LichessPgnViewer(domElement, {
  pgn: 'e4 c5 Nf3 d6 e5 Nc6 exd6 Qxd6 Nc3 Nf6',
});
```

### Configuration

```js
LichessPgnViewer(domElement, {
  pgn: 'e4 c5 Nf3 d6 e5 Nc6 exd6 Qxd6 Nc3 Nf6',
  initialPly: 'last',
  chessground: {
    // any chessground option
    // https://github.com/lichess-org/chessground/blob/master/src/config.ts
  },
  showPlayers: true,
  showMoves: true,
  scrollToMove: true,
  orientation: 'white',
});
```

View more examples in `demo/index.html`
