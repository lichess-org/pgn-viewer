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

export const formatMoveForScreenReader = (san: string, nags?: number[], translate?: Translate): string => {
  let formatted = translate ? transSanToWords(san, translate) : san;

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

const transSanToWords = (san: string, translate: Translate): string =>
  san
    .split('')
    .map(c => {
      if (c === 'x') return translate('san.takes');
      if (c === '+') return translate('san.check');
      if (c === '#') return translate('san.checkmate');
      if (c === '=') return translate('san.promotesTo');
      if (c === '@') return translate('san.droppedOn');
      const code = c.charCodeAt(0);
      if (code > 48 && code < 58) return c; // 1-8
      if (code > 96 && code < 105) return c.toUpperCase(); // a-h
      if (c === 'K') return translate('aria.piece.king');
      if (c === 'Q') return translate('aria.piece.queen');
      if (c === 'R') return translate('aria.piece.rook');
      if (c === 'B') return translate('aria.piece.bishop');
      if (c === 'N') return translate('aria.piece.knight');
      if (c === 'O') return 'O'; // for castling
      return c;
    })
    .join(' ')
    .replace('O - O - O', translate('san.longCastling'))
    .replace('O - O', translate('san.shortCastling'));
