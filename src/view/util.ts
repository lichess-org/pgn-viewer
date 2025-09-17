import { Hooks } from 'snabbdom';
import { glyphs } from './glyph';
import { Translate } from '../interfaces';
import { Piece, Rank } from 'chessground/types';

export function bindMobileMousedown(el: HTMLElement, f: (e: Event) => unknown, redraw?: () => void): void {
  for (const mousedownEvent of ['touchstart', 'mousedown']) {
    el.addEventListener(
      mousedownEvent,
      e => {
        f(e);
        e.preventDefault();
        if (redraw) redraw();
      },
      { passive: false },
    );
  }
}

export const bind = <E extends Event>(
  eventName: string,
  f: (e: E) => any,
  redraw?: () => void,
  passive = true,
): Hooks =>
  onInsert(el =>
    el.addEventListener(
      eventName,
      e => {
        const res = f(e as E);
        if (res === false) e.preventDefault();
        redraw?.();
        return res;
      },
      { passive },
    ),
  );

export function onInsert<A extends HTMLElement>(f: (element: A) => void): Hooks {
  return {
    insert: vnode => f(vnode.elm as A),
  };
}

export const clockContent = (seconds: number | undefined): string[] => {
  if (!seconds && seconds !== 0) return ['-'];
  const date = new Date(seconds * 1000),
    sep = ':',
    baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
  return seconds >= 3600 ? [Math.floor(seconds / 3600) + sep + baseStr] : [baseStr];
};

const pad2 = (num: number): string => (num < 10 ? '0' : '') + num;

export const formatSquareForScreenReader = (
  translate: Translate,
  file: string,
  rank: Rank,
  piece?: Piece,
): string => {
  const square = `${file.toUpperCase()}${rank}`;
  if (!piece) return `${square} ${translate('aria.empty')}`;
  const pieceName = translate(`aria.piece.${piece.role}`);
  return `${square} ${translate(`aria.${piece.color}`)} ${pieceName}`;
};

export const formatMoveForScreenReader = (san: string, nags?: number[]): string => {
  // Turns "Be2" into "B e2" and includes annotations. Without spacing "Be2" sounds exactly like "B2" which may be confusing.
  let formatted = san.replace(/^([KQRBN])(x?)([a-h][1-8])/, '$1 $2$3');

  if (nags && nags.length > 0) {
    const annotations = nags
      .map(nag => glyphs[nag]?.name)
      .filter(name => name)
      .join(', ');

    if (annotations) {
      formatted += `, ${annotations}`;
    }
  }

  return formatted;
};
