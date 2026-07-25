import { h } from 'snabbdom';

import { type InitialOrMove } from '../interfaces';
import type PgnViewer from '../pgnViewer';

// A prominent, single-move commentary panel: shows the comment for whichever
// position `data` represents (or the game's own leading comment, at the
// start position) — and nothing else. This is the natural counterpart to
// showVariations: false in view/side.ts — instead of reading every move's
// comment inline while scanning the move list, the *current* move's comment
// gets a large, dedicated home that updates as the reader steps through the
// game, whether or not the move list itself shows comments inline too.
//
// Defaults to the main view's own current position, but callers with their
// own notion of "current" (variation popups, each independently navigable)
// pass their own data in explicitly.
export const renderCommentary = (ctrl: PgnViewer, data: InitialOrMove = ctrl.curData()) => {
  const text = data.comments.join(' ');
  return h(
    'div.lpv__commentary',
    {
      attrs: {
        role: 'note',
        'aria-live': 'polite',
        'aria-label': ctrl.translate('aria.currentComment'),
      },
    },
    [
      text
        ? h('p.lpv__commentary__text', text)
        : h('p.lpv__commentary__text.lpv__commentary__text--empty', ctrl.translate('noComment')),
    ],
  );
};
