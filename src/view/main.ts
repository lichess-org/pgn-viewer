import Ctrl from '../ctrl';
import { Chessground } from 'chessground';
import { Config as CgConfig } from 'chessground/config';
import { h, VNode } from 'snabbdom';
import { onInsert } from './util';
import { onKeyDown, stepwiseScroll } from '../events';
import { renderMenu, renderControls } from './menu';
import { renderMoves } from './side';
import renderPlayer from './player';

export default function view(ctrl: Ctrl) {
  return h(
    `div.lpv.lpv--moves-${ctrl.opts.showMoves}`,
    {
      class: {
        'lpv--menu': ctrl.pane != 'board',
        'lpv--players': ctrl.opts.showPlayers == 'auto' ? ctrl.game.hasPlayerName() : ctrl.opts.showPlayers,
      },
      attrs: {
        tabindex: 0,
      },
      hook: onInsert(el => {
        ctrl.setGround(Chessground(el.querySelector('.cg-wrap') as HTMLElement, makeConfig(ctrl, el)));
        el.addEventListener('keydown', onKeyDown(ctrl));
      }),
    },
    [
      ctrl.opts.showPlayers ? renderPlayer(ctrl, 'top') : undefined,
      renderBoard(ctrl),
      ctrl.opts.showPlayers ? renderPlayer(ctrl, 'bottom') : undefined,
      renderControls(ctrl),
      ctrl.opts.showMoves ? renderMoves(ctrl) : undefined,
      ctrl.pane == 'menu' ? renderMenu(ctrl) : ctrl.pane == 'pgn' ? renderPgnPane(ctrl) : undefined,
    ]
  );
}

const renderBoard = (ctrl: Ctrl): VNode =>
  h(
    'div.lpv__board',
    {
      hook: onInsert(el => {
        el.addEventListener('click', ctrl.focus);
        if (ctrl.opts.scrollToMove && !('ontouchstart' in window))
          el.addEventListener(
            'wheel',
            stepwiseScroll((e: WheelEvent, scroll: boolean) => {
              e.preventDefault();
              if (e.deltaY > 0 && scroll) ctrl.goTo('next', false);
              else if (e.deltaY < 0 && scroll) ctrl.goTo('prev', false);
            })
          );
      }),
    },
    h('div.cg-wrap')
  );

const renderPgnPane = (ctrl: Ctrl): VNode => {
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
      ctrl.translate('download')
    ),
    h('textarea.lpv__pgn__text', ctrl.opts.pgn),
  ]);
};

export const makeConfig = (ctrl: Ctrl, rootEl: HTMLElement): CgConfig => ({
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
