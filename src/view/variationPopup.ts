import { Chessground } from '@lichess-org/chessground';
import { type Config as CgConfig } from '@lichess-org/chessground/config';
import { h, type VNode } from 'snabbdom';

import { isMoveData } from '../game';
import { type GoTo, type VariationPopup } from '../interfaces';
import { Path } from '../path';
import type PgnViewer from '../pgnViewer';

import { ariaHidden } from './aria';
import { renderCommentary } from './commentary';
import { bindArrowOverlayClicks, continuationArrows, renderArrowOverlay } from './variationArrows';
import { moveTurn } from './side';
import { onInsert } from './util';

const makePopupConfig = (ctrl: PgnViewer, path: Path): CgConfig => ({
  viewOnly: true,
  drawable: { enabled: false },
  disableContextMenu: true,
  ...ctrl.opts.chessground,
  movable: { free: false },
  draggable: { enabled: false },
  selectable: { enabled: false },
  ...ctrl.cgStateFor(path),
});

const popupTitle = (ctrl: PgnViewer, path: Path): string => {
  const data = ctrl.game.dataAt(path) || ctrl.game.initial;
  if (!isMoveData(data)) return ctrl.translate('gameStart');
  const dots = data.ply % 2 === 1 ? '.' : '...';
  return `${moveTurn(data)}${dots}${data.san}`;
};

export function renderVariationPopup(ctrl: PgnViewer, popup: VariationPopup, index: number): VNode {
  const node = ctrl.popupNodeAt(index);
  const arrows = continuationArrows(node, ctrl.opts.mainlineArrow);

  return h(
    'div.lpv__variation-popup',
    {
      key: popup.id,
      attrs: { style: `--lpv-popup-index: ${index}` },
    },
    [
      h('div.lpv__variation-popup__header', [
        h('span.lpv__variation-popup__title', popupTitle(ctrl, popup.path)),
        h(
          'button.lpv__variation-popup__close.lpv__fbt',
          {
            attrs: { 'aria-label': ctrl.translate('aria.closeVariation') },
            hook: onInsert(el => el.addEventListener('click', () => ctrl.closeVariationPopupsFrom(index))),
          },
          '✕',
        ),
      ]),
      h(
        'div.lpv__variation-popup__board',
        {
          attrs: ariaHidden,
          hook: onInsert(el =>
            bindArrowOverlayClicks(
              el,
              path => ctrl.popupToPath(index, new Path(path)),
              path => ctrl.openVariationPopup(new Path(path)),
            ),
          ),
        },
        [
          h('div.cg-wrap', {
            hook: onInsert(el => ctrl.setPopupGround(index, Chessground(el, makePopupConfig(ctrl, popup.path)))),
          }),
          renderArrowOverlay(arrows, ctrl.orientation()),
        ],
      ),
      h('div.lpv__variation-popup__controls', [
        popupNavButton(ctrl, index, 'prev', '◀'),
        popupNavButton(ctrl, index, 'next', '▶'),
      ]),
      renderCommentary(ctrl, ctrl.game.dataAt(popup.path) || ctrl.game.initial),
    ],
  );
}

const popupNavButton = (ctrl: PgnViewer, index: number, to: GoTo, label: string) => {
  const isDisabled = !ctrl.canPopupGoTo(index, to);
  return h(
    `button.lpv__variation-popup__nav.lpv__fbt`,
    {
      class: { disabled: isDisabled },
      attrs: { 'aria-label': ctrl.translate(`aria.${to}`), disabled: isDisabled },
      hook: onInsert(el => el.addEventListener('click', () => ctrl.popupGoTo(index, to))),
    },
    label,
  );
};
