import PgnViewer from '../pgnViewer';
import { Chessground } from 'chessground';
import { Config as CgConfig } from 'chessground/config';
import { h, VNode } from 'snabbdom';
import { onInsert, clockContent, formatMoveForScreenReader } from './util';
import { onKeyDown, stepwiseScroll } from '../events';
import { renderMenu, renderControls } from './menu';
import { renderMoves } from './side';
import renderPlayer from './player';
import { isMoveData } from '../game';
import { Player } from '../interfaces';
import { glyphs } from './glyph';

export default function view(ctrl: PgnViewer) {
  const opts = ctrl.opts,
    staticClasses = `lpv.lpv--moves-${opts.showMoves}.lpv--controls-${opts.showControls}${
      opts.classes ? '.' + opts.classes.replace(' ', '.') : ''
    }`;
  const showPlayers = opts.showPlayers == 'auto' ? ctrl.game.hasPlayerName() : opts.showPlayers;
  return h(
    `div.${staticClasses}`,
    {
      class: {
        'lpv--menu': ctrl.pane != 'board',
        'lpv--players': showPlayers,
      },
      attrs: {
        role: 'region',
        tabindex: 0,
        'aria-label': renderRootAriaLabel(ctrl),
      },
      hook: onInsert(el => {
        ctrl.setGround(Chessground(el.querySelector('.cg-wrap') as HTMLElement, makeConfig(ctrl, el)));
        if (opts.keyboardToMove) el.addEventListener('keydown', onKeyDown(ctrl));
      }),
    },
    [
      h(
        'div.lpv__sr-only',
        {
          attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' },
        },
        renderAriaAnnouncement(ctrl),
      ),
      showPlayers ? renderPlayer(ctrl, 'top') : undefined,
      renderBoard(ctrl),
      showPlayers ? renderPlayer(ctrl, 'bottom') : undefined,
      opts.showControls ? renderControls(ctrl) : undefined,
      opts.showMoves ? renderMoves(ctrl) : undefined,
      ctrl.pane == 'menu' ? renderMenu(ctrl) : ctrl.pane == 'pgn' ? renderPgnPane(ctrl) : undefined,
    ],
  );
}

const renderBoard = (ctrl: PgnViewer): VNode =>
  h(
    'div.lpv__board',
    {
      attrs: {
        'aria-hidden': 'true',
      },
      hook: onInsert(el => {
        el.addEventListener('click', ctrl.focus);
        if (ctrl.opts.scrollToMove && !('ontouchstart' in window))
          el.addEventListener(
            'wheel',
            stepwiseScroll((e: WheelEvent, scroll: boolean) => {
              e.preventDefault();
              if (e.deltaY > 0 && scroll) ctrl.goTo('next', false);
              else if (e.deltaY < 0 && scroll) ctrl.goTo('prev', false);
            }),
          );
      }),
    },
    h('div.cg-wrap'),
  );

const renderPgnPane = (ctrl: PgnViewer): VNode => {
  const blob = new Blob([ctrl.opts.pgn], { type: 'text/plain' });
  return h('div.lpv__pgn.lpv__pane', [
    h(
      'a.lpv__pgn__download.lpv__fbt',
      {
        attrs: {
          href: window.URL.createObjectURL(blob),
          download: ctrl.opts.menu.getPgn.fileName || `${ctrl.game.title()}.pgn`,
        },
      },
      ctrl.translate('download'),
    ),
    h('textarea.lpv__pgn__text', ctrl.opts.pgn),
  ]);
};

const renderAriaAnnouncement = (ctrl: PgnViewer): string => {
  const data = ctrl.curData();

  if (!isMoveData(data)) return '';

  const moveNumber = Math.ceil(data.ply / 2);
  const color = data.ply % 2 === 1 ? 'white' : 'black';
  const san = data.san;

  let announcement = ctrl.translate('aria.move', moveNumber.toString(), ctrl.translate(`aria.${color}`), formatMoveForScreenReader(san));

  if (data.check) {
    announcement += ', ' + ctrl.translate('aria.check');
  }

  const clock = data.clocks && data.clocks[color === 'white' ? 'white' : 'black'];
  if (clock !== undefined && ctrl.opts.showClocks) {
    const clockTime = clockContent(clock).join('');
    if (clockTime !== '-') {
      announcement += ', ' + ctrl.translate('aria.remaining', clockTime);
    }
  }

  const annotations = data.nags
    .map(nag => glyphs[nag]?.name)
    .filter(name => name)
    .join(', ');

  if (annotations) {
    announcement += `, ${annotations}`;
  }

  const comments = data.comments.join(' ').trim();
  if (comments) {
    announcement += `. ${comments}`;
  }

  return announcement;
};

const renderRootAriaLabel = (ctrl: PgnViewer): string => {
  const game = ctrl.game;

  const formatPlayer = (player: Player): string => {
    let playerInfo = player.name || ctrl.translate('aria.unknownPlayer');
    if (player.title) {
      playerInfo = `${player.title} ${playerInfo}`;
    }
    if (player.rating) {
      playerInfo = `${playerInfo}, ${ctrl.translate('aria.rated', player.rating.toString())}`;
    }
    return playerInfo;
  };

  const formatResult = (result?: string): string => {
    if (!result || result === '*') return ctrl.translate('aria.gameInProgress');
    if (result === '1-0') return ctrl.translate('aria.whitesWin');
    if (result === '0-1') return ctrl.translate('aria.blacksWin');
    if (result === '1/2-1/2') return ctrl.translate('aria.draw');
    return result; // fallback for any other result format
  };

  const whiteName = formatPlayer(game.players.white);
  const blackName = formatPlayer(game.players.black);
  const result = formatResult(game.metadata.result);

  return ctrl.translate('aria.chessGameBetween', whiteName, blackName, result);
};

export const makeConfig = (ctrl: PgnViewer, rootEl: HTMLElement): CgConfig => ({
  viewOnly: !ctrl.opts.drawArrows,
  addDimensionsCssVarsTo: rootEl,
  drawable: {
    enabled: ctrl.opts.drawArrows,
    visible: true,
  },
  disableContextMenu: ctrl.opts.drawArrows,
  ...(ctrl.opts.chessground || {}),
  movable: {
    free: false,
  },
  draggable: {
    enabled: false,
  },
  selectable: {
    enabled: false,
  },
  ...ctrl.cgState(),
});
