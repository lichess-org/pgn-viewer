import { Api as CgApi } from 'chessground/api';
import { makeSquare, opposite, Color } from 'chessops';
import translator from './translation';
import { GoTo, InitialOrMove, Opts, Translate } from './interfaces';
import { Config as CgConfig } from 'chessground/config';
import { uciToMove } from 'chessground/util';
import { Path } from './path';
import { AnyNode, Game, isMoveData } from './game';
import { makeGame } from './pgn';
import { parsePgn } from 'chessops/pgn';

export default class PgnViewer {
  games: Game[];
  path: Path;
  translate: Translate;
  ground?: CgApi;
  div?: HTMLElement;
  flipped = false;
  pane = 'board';
  autoScrollRequested = false;
  selectedGame = 0;

  constructor(
    readonly opts: Opts,
    readonly redraw: () => void,
  ) {
    let games = parsePgn(opts.pgn);
    if (games.length === 0) games = parsePgn('*');
    this.games = games.map(game => makeGame(game, opts.lichess));
    this.translate = translator(opts.translate);
    this.path = this.game.pathAtMainlinePly(this.opts.initialPly);
  }

  get game() {
    return this.games[this.selectedGame];
  }
  selectIndex = (i: number) => {
    this.selectedGame = Math.max(0, Math.min(this.games.length - 1, i));
    this.path = Path.root;
    this.redraw();
  };

  curNode = (): AnyNode => this.game.nodeAt(this.path) || this.game.moves;
  curData = (): InitialOrMove => this.game.dataAt(this.path) || this.game.initial;

  goTo = (to: GoTo, focus = true) => {
    let index = this.selectedGame;
    let path = this.path;

    if (to === 'first') path = Path.root;
    if (to === 'last') path = this.game.pathAtMainlinePly('last');
    if (to === 'prev') path = this.path.init();
    if (to === 'next') path = this.game.nodeAt(this.path)?.children?.[0]?.data?.path ?? path;

    if (this.path.path === path.path) {
      if (to === 'first') index = 0;
      if (to === 'last') index = this.games.length - 1;
      if (to === 'prev') index--;
      if (to === 'next') index++;
      if (index < 0) index = 0;
      if (index >= this.games.length) index = this.games.length - 1;
    }

    if (index !== this.selectedGame) {
      this.selectIndex(index);
      if (to === 'first') path = Path.root;
      if (to === 'last') path = this.game.pathAtMainlinePly('last');
      if (to === 'prev') path = this.game.pathAtMainlinePly('last');
      if (to === 'next') path = Path.root;
    }

    this.toPath(path || this.path, focus);
  };

  canGoTo = (to: GoTo) =>
    to === 'prev' || to === 'first'
      ? this.selectedGame > 0 || !this.path.empty()
      : this.selectedGame < this.games.length - 1 || !!this.curNode().children[0];

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
  };
  togglePgn = () => {
    this.pane = this.pane == 'pgn' ? 'board' : 'pgn';
    this.redraw();
  };

  orientation = () => {
    const base = this.game.metadata.orientation ?? this.opts.orientation ?? 'white';
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

  analysisUrl = () =>
    (this.game.metadata.isLichess && this.game.metadata.externalLink) ||
    `https://lichess.org/analysis/${this.curData().fen.replace(' ', '_')}?color=${this.orientation()}`;
  practiceUrl = () => `${this.analysisUrl()}#practice`;

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
