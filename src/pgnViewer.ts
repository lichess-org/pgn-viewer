import { Api as CgApi } from '@lichess-org/chessground/api';
import { makeSquare, opposite } from 'chessops';
import translator from './translation';
import { GoTo, InitialOrMove, Opts, Translate } from './interfaces';
import { Config as CgConfig } from '@lichess-org/chessground/config';
import { uciToMove } from '@lichess-org/chessground/util';
import { Path } from './path';
import { AnyNode, Game, isMoveData } from './game';
import { makeGame } from './pgn';

export default class PgnViewer {
  game: Game;
  path: Path;
  translate: Translate;
  ground?: CgApi;
  div?: HTMLElement;
  menuButton?: HTMLElement;
  flipped = false;
  pane = 'board';
  autoScrollRequested = false;

  constructor(
    readonly opts: Opts,
    readonly redraw: () => void,
  ) {
    this.game = makeGame(opts.pgn, opts.lichess);
    opts.orientation = opts.orientation || this.game.metadata.orientation;
    this.translate = translator(opts.translate);
    this.path = this.game.pathAtMainlinePly(opts.initialPly);
  }

  curNode = (): AnyNode => this.game.nodeAt(this.path) || this.game.moves;
  curData = (): InitialOrMove => this.game.dataAt(this.path) || this.game.initial;

  goTo = (to: GoTo, focus = true) => {
    const path =
      to == 'first'
        ? Path.root
        : to == 'prev'
          ? this.path.init()
          : to == 'next'
            ? this.game.nodeAt(this.path)?.children[0]?.data.path
            : this.game.pathAtMainlinePly('last');
    this.toPath(path || this.path, focus);
  };

  canGoTo = (to: GoTo) => (to == 'prev' || to == 'first' ? !this.path.empty() : !!this.curNode().children[0]);

  toPath = (path: Path, focus = true) => {
    this.path = path;
    this.pane = 'board';
    this.autoScrollRequested = true;
    this.redrawGround();
    this.redraw();
    if (focus) this.focus();
  };

  focus = () => this.div?.focus();

  toggleMenu = () => {
    this.pane = this.pane == 'board' ? 'menu' : 'board';
    this.redraw();

    if (this.pane == 'board') {
      // Menu has been closed - return focus to menu button
      setTimeout(() => this.menuButton?.focus(), 0);
    }
  };
  togglePgn = () => {
    this.pane = this.pane == 'pgn' ? 'board' : 'pgn';
    this.redraw();
  };

  orientation = () => {
    const base = this.opts.orientation || 'white';
    return this.flipped ? opposite(base) : base;
  };

  flip = () => {
    this.flipped = !this.flipped;
    this.pane = 'board';
    this.redrawGround();
    this.redraw();
  };

  cgState = (): CgConfig => {
    const data = this.curData();
    const lastMove = isMoveData(data) ? uciToMove(data.uci) : this.opts.chessground?.lastMove;
    return {
      fen: data.fen,
      orientation: this.orientation(),
      check: data.check,
      lastMove,
      turnColor: data.turn,
    };
  };

  analysisUrl = (forPractice: boolean): string => {
    const mainlinePly = this.plyOnMainline();
    const onMainline = mainlinePly !== undefined;
    return this.game.metadata.isLichess && this.game.metadata.externalLink && onMainline && !forPractice
      ? this.game.metadata.externalLink + `#${mainlinePly}`
      : `https://lichess.org/analysis/${this.curData().fen.replace(' ', '_')}?color=${this.orientation()}`;
  };

  practiceUrl = () => `${this.analysisUrl(true)}#practice`;

  private plyOnMainline(): number | undefined {
    const data = this.curData();
    const ply = isMoveData(data) ? data.ply : 0;
    const onMainline =
      ply === 0
        ? this.path.empty()
        : !!this.game.mainline[ply - 1] && this.game.mainline[ply - 1].path.equals(this.path);
    return onMainline ? ply : undefined;
  }

  setGround = (cg: CgApi) => {
    this.ground = cg;
    this.redrawGround();
  };

  private redrawGround = () =>
    this.withGround(g => {
      g.set(this.cgState());
      g.setShapes(
        this.curData().shapes.map(s => ({
          orig: makeSquare(s.from),
          dest: makeSquare(s.to),
          brush: s.color,
        })),
      );
    });
  private withGround = (f: (cg: CgApi) => void) => this.ground && f(this.ground);
}
