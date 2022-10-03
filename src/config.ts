import { Opts } from './interfaces';

const defaults: Opts = {
  pgn: '*', // the PGN to render
  fen: undefined, // initial FEN, will append [FEN "initial FEN"] to the PGN
  showPlayers: 'auto', // show the players above and under the board
  showClocks: true, // show the clocks alongside the players
  scrollToMove: true, // enable scrolling through moves with a mouse wheel
  orientation: 'white', // default orientation of the board
  initialPly: 0, // current position to display. Can be a number, or "last"
  chessground: {}, // chessground configuration https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7
  showMoves: 'auto', // false | "right" | "bottom" | auto. "auto" uses media queries
  drawArrows: true, // allow mouse users to draw volatile arrows on the board. Disable for little perf boost
  menu: {
    getPgn: {
      enabled: true, // enable the "Get PGN" menu entry
      fileName: undefined, // name of the file when user clicks "Download PGN". Leave empty for automatic name.
    },
  },
  lichess: 'https://lichess.org', // support for Lichess games, with links to the game and players. Set to false to disable.
};

export default function (cfg: Partial<Opts>) {
  const opts = { ...defaults };
  deepMerge(opts, cfg);
  if (opts.fen) opts.pgn = `[FEN "${opts.fen}"]\n${opts.pgn}`;
  return opts;
}

function deepMerge(base: any, extend: any): void {
  for (const key in extend) {
    if (typeof extend[key] !== 'undefined') {
      if (isPlainObject(base[key]) && isPlainObject(extend[key])) deepMerge(base[key], extend[key]);
      else base[key] = extend[key];
    }
  }
}

function isPlainObject(o: unknown): boolean {
  if (typeof o !== 'object' || o === null) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}
