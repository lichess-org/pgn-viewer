import { type Api as CgApi } from '@lichess-org/chessground/api';
import { type Config as CgConfig } from '@lichess-org/chessground/config';
import { uciToMove } from '@lichess-org/chessground/util';
import { makeSquare, opposite } from 'chessops';

import { type AnyNode, type Game, isMoveData } from './game';
import {
  type GoTo,
  type InitialOrMove,
  type Opts,
  type Pane,
  type Translate,
  type VariationPopup,
} from './interfaces';
import { Path } from './path';
import { makeGame } from './pgn';
import translator from './translation';

export default class PgnViewer {
  game: Game;
  path: Path;
  translate: Translate;
  ground?: CgApi;
  div?: HTMLElement;
  menuButton?: HTMLElement;
  flipped = false;
  pane: Pane = 'board';
  autoScrollRequested = false;
  variationPopups: VariationPopup[] = [];
  private nextPopupId = 0;
  private popupGrounds = new Map<number, CgApi>();

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
      to === 'first'
        ? Path.root
        : to === 'prev'
          ? this.path.init()
          : to === 'next'
            ? this.game.nodeAt(this.path)?.children[0]?.data.path
            : this.game.pathAtMainlinePly('last');
    this.toPath(path || this.path, focus);
  };

  canGoTo = (to: GoTo) =>
    to === 'prev' || to === 'first' ? !this.path.empty() : !!this.curNode().children[0];

  toPath = (path: Path, focus = true) => {
    this.path = path;
    this.pane = 'board';
    this.autoScrollRequested = true;
    this.destroyAllPopups();
    this.redrawGround();
    this.redraw();
    if (focus) this.focus();
  };

  focus = () => this.div?.focus();

  toggleMenu = () => {
    this.pane = this.pane === 'board' ? 'menu' : 'board';
    this.redraw();

    if (this.pane === 'board') {
      // Menu has been closed - return focus to menu button
      setTimeout(() => this.menuButton?.focus(), 0);
    }
  };
  togglePgn = () => {
    this.pane = this.pane === 'pgn' ? 'board' : 'pgn';
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

  cgState = (): CgConfig => this.cgStateFor(this.path);

  cgStateFor = (path: Path): CgConfig => {
    const data = this.game.dataAt(path) || this.game.initial;
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

  // --- Variation popups -----------------------------------------------
  // Each popup is a lightweight, independently-navigable view onto some
  // position in the (shared, immutable) game tree — identified by an
  // absolute Path from the game root, same as the main path. Opening a
  // variation from *within* a popup just pushes another popup onto the
  // same stack, so popups can nest to arbitrary depth without any special
  // casing: they all reuse this same generic path-based machinery.

  openVariationPopup = (path: Path) => {
    this.variationPopups.push({ id: this.nextPopupId++, path, rootPath: path });
    this.redraw();
  };

  // Closing a popup also closes any popups opened "on top of" it, since a
  // nested popup only makes sense in the context of the one it branched
  // from being open.
  closeVariationPopupsFrom = (index: number) => {
    for (const popup of this.variationPopups.slice(index)) {
      this.popupGrounds.get(popup.id)?.destroy();
      this.popupGrounds.delete(popup.id);
    }
    this.variationPopups = this.variationPopups.slice(0, index);
    this.redraw();
  };

  private destroyAllPopups = () => {
    for (const ground of this.popupGrounds.values()) ground.destroy();
    this.popupGrounds.clear();
    this.variationPopups = [];
  };

  popupNodeAt = (index: number): AnyNode =>
    this.game.nodeAt(this.variationPopups[index].path) || this.game.moves;

  // "prev"/"first" never go earlier than the popup's own rootPath — without
  // this, repeatedly rewinding a popup would walk straight through the
  // branching point into the outer game's own history, effectively showing
  // the same position the main board (or a parent popup) already does.
  canPopupGoTo = (index: number, to: GoTo) => {
    const popup = this.variationPopups[index];
    if (to === 'prev' || to === 'first') return !popup.path.equals(popup.rootPath);
    return !!this.popupNodeAt(index).children[0];
  };

  popupGoTo = (index: number, to: GoTo) => {
    const popup = this.variationPopups[index];
    if ((to === 'prev' || to === 'first') && popup.path.equals(popup.rootPath)) return;
    const path =
      to === 'first'
        ? popup.rootPath
        : to === 'prev'
          ? this.clampToRoot(popup.path.init(), popup.rootPath)
          : to === 'next'
            ? this.game.nodeAt(popup.path)?.children[0]?.data.path
            : this.popupLastPath(index);
    this.popupToPath(index, path || popup.path);
  };

  // If stepping back would overshoot the popup's own root (e.g. its root is
  // several plies deep into the tree, "prev" moving one ply at a time could
  // otherwise land *before* it rather than exactly on it), clamp to the root.
  private clampToRoot = (path: Path, rootPath: Path): Path =>
    path.size() < rootPath.size() ? rootPath : path;

  private popupLastPath = (index: number): Path => {
    const popup = this.variationPopups[index];
    let node: AnyNode = this.game.nodeAt(popup.rootPath) || this.game.moves;
    let lastPath = popup.rootPath;
    while (node.children[0]) {
      const child = node.children[0];
      lastPath = child.data.path;
      node = child;
    }
    return lastPath;
  };

  popupToPath = (index: number, path: Path) => {
    this.variationPopups[index].path = path;
    this.redrawPopupGround(index);
    this.redraw();
  };

  setPopupGround = (index: number, cg: CgApi) => {
    this.popupGrounds.set(this.variationPopups[index].id, cg);
    this.redrawPopupGround(index);
  };

  private redrawPopupGround = (index: number) => {
    const popup = this.variationPopups[index];
    const ground = popup && this.popupGrounds.get(popup.id);
    if (!ground) return;
    ground.set(this.cgStateFor(popup.path));
    const data = this.game.dataAt(popup.path) || this.game.initial;
    ground.setShapes(
      data.shapes.map(s => ({
        orig: makeSquare(s.from),
        dest: makeSquare(s.to),
        brush: s.color,
      })),
    );
  };
}
