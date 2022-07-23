import { Api as CgApi } from 'chessground/api';
import { opposite } from 'chessops';
import translator from './translation';
import { makeGame } from './pgn';
import { Opts, Translate } from './interfaces';
import { Config as CgConfig } from 'chessground/config';
import { uciToMove } from 'chessground/util';
import { Path } from './path';
import { Game, isMoveData } from './game';

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
      : Path.root;
  }

  curNode = () => this.game.nodeAt(this.path) || this.game.moves;
  curData = () => this.game.dataAt(this.path) || this.game.initial;

  onward = (dir: -1 | 1) =>
    this.toPath(dir == -1 ? this.path.init() : this.game.nodeAt(this.path).children[0]?.data.path || this.path);

  canOnward = (dir: -1 | 1) => (dir == -1 && !this.path.empty()) || !!this.curNode().children[0];

  toPath = (path: Path) => {
    this.path = path;
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
    this.setGround();
    this.redraw();
  };

  cgConfig = (): CgConfig => {
    const data = this.curData();
    const lastMove = isMoveData(data) && uciToMove(data.uci);
    return {
      ...(this.opts.chessground || {}),
      fen: this.curData().fen,
      orientation: this.orientation(),
      check: this.curData().check,
      lastMove,
    };
  };

  analysisUrl = () => `https://lichess.org/analysis/${this.curData().fen.replace(' ', '_')}?color=${this.orientation}`;
  practiceUrl = () => `${this.analysisUrl()}#practice`;

  private setGround = () => this.withGround(g => g.set(this.cgConfig()));

  private withGround = (f: (cg: CgApi) => void) => this.ground && f(this.ground);
}
