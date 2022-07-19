import { Api as CgApi } from 'chessground/api';
import { opposite } from 'chessops';
import { Game, parsePgn, PgnNodeData } from 'chessops/pgn';
import translator from './translation';
import { makeNodes } from './pgn';
import { Opts, Node, Translate } from './interfaces';
import { uciToMove } from 'chessground/util';
import { Config as CgConfig } from 'chessground/config';

export default class Ctrl {
  flipped: boolean = false;
  game: Game<PgnNodeData>;
  nodes: Node[] = [];
  index = 0;
  translate: Translate;
  ground?: CgApi;
  menu = false;

  constructor(readonly opts: Opts, readonly redraw: () => void) {
    this.translate = translator(opts.translate);
    this.game = parsePgn(opts.pgn)[0];
    this.nodes = makeNodes(this.game);
    this.index = opts.initialPly == 'last' ? this.nodes.length - 1 : opts.initialPly || 0;
  }

  node = () => this.nodes[this.index];

  onward = (dir: -1 | 1) => {
    this.index = Math.min(this.nodes.length - 1, Math.max(0, this.index + dir));
    this.menu = false;
    this.setGround();
    this.redraw();
  };

  toggleMenu = () => {
    this.menu = !this.menu;
    this.redraw();
  };

  orientation = () => {
    const base = this.opts.orientation || 'white';
    return this.flipped ? opposite(base) : base;
  };

  flip = () => {
    this.flipped = true;
    this.menu = false;
    this.redraw();
  };

  cgConfig = (): CgConfig => ({
    ...(this.opts.chessground || {}),
    fen: this.node().fen,
    orientation: this.orientation(),
    check: this.node().check,
    lastMove: uciToMove(this.node().uci),
  });

  analysisUrl = () => `https://lichess.org/analysis/${this.node().fen.replace(' ', '_')}?color=${this.orientation}`;
  practiceUrl = () => `${this.analysisUrl()}#practice`;

  private setGround = () => this.withGround(g => g.set(this.cgConfig()));

  private withGround = (f: (cg: CgApi) => void) => this.ground && f(this.ground);
}
