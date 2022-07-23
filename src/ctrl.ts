import { Api as CgApi } from 'chessground/api';
import { opposite } from 'chessops';
import translator from './translation';
import { makeGame } from './pgn';
import { BaseNode, MoveNode, Opts, Translate } from './interfaces';
import { Config as CgConfig } from 'chessground/config';
import { Path } from './path';
import { Game } from './game';

export default class Ctrl {
  flipped: boolean = false;
  game: Game;
  path: Path;
  translate: Translate;
  ground?: CgApi;
  menu = false;

  constructor(readonly opts: Opts, readonly redraw: () => void) {
    this.translate = translator(opts.translate);
    this.game = makeGame(opts.pgn);
    this.path = opts.initialPly
      ? this.game.mainline[opts.initialPly == 'last' ? this.game.mainline.length - 1 : opts.initialPly].path
      : this.game.root.path;
  }

  // node = () => this.nodes[this.index];
  node = (): BaseNode => this.game.find(this.path) || this.game.root;

  onward = (dir: -1 | 1) => {
    // this.path = Math.min(this.nodes.length - 1, Math.max(0, this.path + dir));
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
    // lastMove: uciToMove(this.node().uci),
  });

  analysisUrl = () => `https://lichess.org/analysis/${this.node().fen.replace(' ', '_')}?color=${this.orientation}`;
  practiceUrl = () => `${this.analysisUrl()}#practice`;

  private setGround = () => this.withGround(g => g.set(this.cgConfig()));

  private withGround = (f: (cg: CgApi) => void) => this.ground && f(this.ground);
}
