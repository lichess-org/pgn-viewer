import { Api as CgApi } from 'chessground/api';
import { opposite } from 'chessops';
import translator from './translation';
import { Opts, Translate } from './interfaces';
import { Config as CgConfig } from 'chessground/config';
import { uciToMove } from 'chessground/util';
import { Path } from './path';
import { Game, isMoveData } from './game';
import { makeGame } from './pgn';

export default class Ctrl {
  game: Game;
  path: Path;
  translate: Translate;
  ground?: CgApi;
  flipped: boolean = false;
  menu = false;

  constructor(readonly opts: Opts, readonly redraw: () => void) {
    this.game = makeGame(opts.pgn);
    this.translate = translator(opts.translate);
    this.path = opts.initialPly
      ? this.game.mainline[opts.initialPly == 'last' ? this.game.mainline.length - 1 : opts.initialPly].path
      : Path.root;
  }

  curNode = () => this.game.nodeAt(this.path) || this.game.moves;
  curData = () => this.game.dataAt(this.path) || this.game.initial;

  onward = (dir: -1 | 1) =>
    this.toPath(dir == -1 ? this.path.init() : this.game.nodeAt(this.path)?.children[0]?.data.path || this.path);

  canOnward = (dir: -1 | 1) => (dir == -1 && !this.path.empty()) || !!this.curNode().children[0];

  toPath = (path: Path) => {
    this.path = path;
    this.menu = false;
    this.redrawGround();
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
    this.flipped = !this.flipped;
    this.menu = false;
    this.redrawGround();
    this.redraw();
  };

  cgConfig = (): CgConfig => {
    const data = this.curData();
    const lastMove = isMoveData(data) ? uciToMove(data.uci) : undefined;
    return {
      ...(this.opts.chessground || {}),
      fen: this.curData().fen,
      orientation: this.orientation(),
      check: this.curData().check,
      lastMove,
      turnColor: data.fen.includes(' w ') ? 'white' : 'black',
    };
  };

  analysisUrl = () => `https://lichess.org/analysis/${this.curData().fen.replace(' ', '_')}?color=${this.orientation}`;
  practiceUrl = () => `${this.analysisUrl()}#practice`;

  setGround = (cg: CgApi) => {
    this.ground = cg;
    this.ground.setShapes(this.curData().shapes);
  };

  private redrawGround = () =>
    this.withGround(g => {
      g.set(this.cgConfig());
      g.setShapes(this.curData().shapes);
    });
  private withGround = (f: (cg: CgApi) => void) => this.ground && f(this.ground);
}
