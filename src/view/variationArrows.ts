import { type Color, type Key } from '@lichess-org/chessground/types';
import { key2pos, uciToMove } from '@lichess-org/chessground/util';
import { h, type VNode } from 'snabbdom';

import { type AnyNode } from '../game';
import { type MainlineArrow } from '../interfaces';

//green for the actual/mainline move, various primary colors for variations
const MAINLINE_COLOR = '#15781b';
const VARIATION_COLORS = ['#0b5db3', '#e68a00', '#b8036f', '#6a3fc7', '#c62828'];

export interface ContinuationArrow {
  id: string;
  from: Key;
  to: Key;
  color: string;
  kind: 'mainline' | 'variation';
  path: string; //navigation path (mainline: within the same context, variation: open in a new popup)
}

/** One arrow per available continuation from `node`: mainline first (if shown), then each variation */
export function continuationArrows(node: AnyNode, mainlineArrow: MainlineArrow = 'always'): ContinuationArrow[] {
  const arrows: ContinuationArrow[] = [];
  const mainlineChild = node.children[0];
  const hasVariations = node.children.length > 1;
  const showMainline = mainlineArrow === 'always' || (mainlineArrow === 'ifVariation' && hasVariations);
  if (mainlineChild && showMainline) {
    const move = uciToMove(mainlineChild.data.uci);
    if (move) {
      arrows.push({
        id: mainlineChild.data.path.path,
        from: move[0],
        to: move[1],
        color: MAINLINE_COLOR,
        kind: 'mainline',
        path: mainlineChild.data.path.path,
      });
    }
  }

  node.children.slice(1).forEach((variation, idx) => {
    const move = uciToMove(variation.data.uci);
    if (move) {
      arrows.push({
        id: variation.data.path.path,
        from: move[0],
        to: move[1],
        color: VARIATION_COLORS[idx % VARIATION_COLORS.length],
        kind: 'variation',
        path: variation.data.path.path,
      });
    }
  });
  return arrows;
}

function squareCenter(key: Key, orientation: Color): { x: number; y: number } {
  const [file, rank] = key2pos(key);
  const x = orientation === 'white' ? file : 7 - file;
  const y = orientation === 'white' ? 7 - rank : rank;
  return { x: x + 0.5, y: y + 0.5 };
}

/**
 * Renders the arrow overlay as an absolutely-positioned SVG.
 * Carries `data-arrow-kind`/`data-arrow-path` attributes (rather than its own click handler),
 * The mounted container (main.ts / variationPopup.ts) attaches a listener to read those
 * attributes, avoiding per-arrow hook rebinding on every redraw.
 */
export function renderArrowOverlay(arrows: ContinuationArrow[], orientation: Color): VNode | undefined {
  if (!arrows.length) return undefined;

  const drawn = arrows.map(arrow => {
    const from = squareCenter(arrow.from, orientation);
    const to = squareCenter(arrow.to, orientation);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const shorten = 0.32; // pull the arrowhead back a little bit for clarity
    return {
      ...arrow,
      x1: from.x,
      y1: from.y,
      x2: to.x - (dx / len) * shorten,
      y2: to.y - (dy / len) * shorten,
    };
  });

  return h(
    'svg.lpv__variation-arrows',
    { attrs: { viewBox: '0 0 8 8', preserveAspectRatio: 'none' } },
    [
      h(
        'defs',
        {},
        drawn.map(arrow =>
          h(
            'marker',
            {
              attrs: {
                id: `lpv-arrowhead-${arrow.id}`,
                markerWidth: 4,
                markerHeight: 4,
                refX: 1.4,
                refY: 2,
                orient: 'auto',
              },
            },
            [h('path', { attrs: { d: 'M0,0 L3,2 L0,4 Z', fill: arrow.color } })],
          ),
        ),
      ),
      ...drawn.map(arrow =>
        h(
          'g.lpv__variation-arrow',
          {
            attrs: {
              'data-arrow-kind': arrow.kind,
              'data-arrow-path': arrow.path,
            },
          },
          [
            //actual click target, easier to hit than the visible arrow
            h('line', {
              attrs: { x1: arrow.x1, y1: arrow.y1, x2: arrow.x2, y2: arrow.y2, stroke: 'transparent', 'stroke-width': 0.5 },
            }),
            h('line', {
              attrs: {
                x1: arrow.x1,
                y1: arrow.y1,
                x2: arrow.x2,
                y2: arrow.y2,
                stroke: arrow.color,
                'stroke-width': 0.13,
                'stroke-linecap': 'round',
                opacity: 0.85,
                'marker-end': `url(#lpv-arrowhead-${arrow.id})`,
              },
            }),
          ],
        ),
      ),
    ],
  );
}

/** Delegated click handler: finds the nearest arrow group, and dispatches based on its kind. */
export function bindArrowOverlayClicks(
  el: HTMLElement,
  onMainline: (path: string) => void,
  onVariation: (path: string) => void,
) {
  el.addEventListener('click', e => {
    const target = (e.target as Element).closest('[data-arrow-kind]');
    if (!target) return;
    const path = target.getAttribute('data-arrow-path') || '';
    if (target.getAttribute('data-arrow-kind') === 'mainline') onMainline(path);
    else onVariation(path);
  });
}
