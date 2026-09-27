import { type DrawShape } from '@lichess-org/chessground/draw';
import { glyphToSvg } from '@lichess-org/chessground/glyph';
import { makeSquare, squareRank } from 'chessops/util';
import { h } from 'snabbdom';

import { type MoveData } from '../interfaces';

export const renderNag = (nag: number) => {
  const glyph = glyphs[nag];
  return glyph ? h('nag', { attrs: { title: glyph.name } }, glyph.symbol) : undefined;
};

type Glyph = {
  symbol: string;
  name: string;
};
type Glyphs = Record<number, Glyph>;

export const glyphs: Glyphs = {
  1: {
    symbol: '!',
    name: 'Good move',
  },
  2: {
    symbol: '?',
    name: 'Mistake',
  },
  3: {
    symbol: '!!',
    name: 'Brilliant move',
  },
  4: {
    symbol: '??',
    name: 'Blunder',
  },
  5: {
    symbol: '!?',
    name: 'Interesting move',
  },
  6: {
    symbol: '?!',
    name: 'Dubious move',
  },
  7: {
    symbol: '□',
    name: 'Only move',
  },
  22: {
    symbol: '⨀',
    name: 'Zugzwang',
  },
  10: {
    symbol: '=',
    name: 'Equal position',
  },
  13: {
    symbol: '∞',
    name: 'Unclear position',
  },
  14: {
    symbol: '⩲',
    name: 'White is slightly better',
  },
  15: {
    symbol: '⩱',
    name: 'Black is slightly better',
  },
  16: {
    symbol: '±',
    name: 'White is better',
  },
  17: {
    symbol: '∓',
    name: 'Black is better',
  },
  18: {
    symbol: '+−',
    name: 'White is winning',
  },
  19: {
    symbol: '-+',
    name: 'Black is winning',
  },
  146: {
    symbol: 'N',
    name: 'Novelty',
  },
  32: {
    symbol: '↑↑',
    name: 'Development',
  },
  36: {
    symbol: '↑',
    name: 'Initiative',
  },
  40: {
    symbol: '→',
    name: 'Attack',
  },
  132: {
    symbol: '⇆',
    name: 'Counterplay',
  },
  138: {
    symbol: '⊕',
    name: 'Time trouble',
  },
  44: {
    symbol: '=∞',
    name: 'With compensation',
  },
  140: {
    symbol: '∆',
    name: 'With the idea',
  },
};

export function annotationShapes(data: MoveData, maxGlyphs: number): DrawShape[] {
  const { move, nags, san } = data;
  const curGlyphs = nags
    .map(nag => glyphs[nag])
    .filter((glyph): glyph is Glyph => !!glyph)
    .slice(0, maxGlyphs);
  if (!move || !san || !curGlyphs.length) return [];
  const destSquare = san.startsWith('O-O') // castle, short or long
    ? squareRank(move.to) === 0 // white castle
      ? san.startsWith('O-O-O')
        ? 'c1'
        : 'g1'
      : san.startsWith('O-O-O')
        ? 'c8'
        : 'g8'
    : makeSquare(move.to);
  const toSvg = glyphToSvg(maxGlyphs);
  return (
    curGlyphs
      .map((glyph, idx) => {
        const symbol = glyph.symbol;
        const prerendered = toSvg[symbol] ? toSvg[symbol](idx) : undefined;
        return {
          orig: destSquare,
          brush: prerendered ? '' : undefined,
          customSvg: prerendered ? { html: prerendered } : undefined,
          label: prerendered ? undefined : { text: symbol, fill: 'purple' },
          // keep some purple just to keep feedback forum on their toes
        };
      })
      // needed so that the right-most (and first) glyph is at the top of the stack
      .reverse()
  );
}
