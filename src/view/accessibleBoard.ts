import { h, VNode } from 'snabbdom';
import PgnViewer from '../pgnViewer';
import { formatSquareForScreenReader } from './util';
import { parseFen } from 'chessops/fen';
import { parseSquare } from 'chessops';
import { Role } from 'chessground/types';

export const renderAccessibleBoard = (ctrl: PgnViewer): VNode => {
  const data = ctrl.curData();
  const fen = data.fen;
  const flipped = ctrl.flipped;

  return h(
    'div.lpv__sr-only',
    {
      attrs: {
        role: 'group',
        'aria-label': ctrl.translate('aria.accessibleChessboard'),
        'aria-hidden': 'false',
      },
    },
    [
      h(
        'div',
        {
          attrs: {
            role: 'grid',
            'aria-label': ctrl.translate('aria.chessboardGrid'),
          },
        },
        renderBoardRows(ctrl, fen, flipped),
      ),
    ],
  );
};

const renderBoardRows = (ctrl: PgnViewer, fen: string, flipped: boolean): VNode[] => {
  const rows: VNode[] = [];
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

  const setup = parseFen(fen);
  if (!setup.isOk) return rows;

  ranks.forEach(rank => {
    const files = flipped
      ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
      : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    const rowCells = files.map(file => {
      const squareKey = `${file}${rank}`;
      const square = parseSquare(squareKey);
      if (square === undefined) return renderSquare(ctrl, file, rank, undefined);

      const piece = setup.value.board.get(square);

      return renderSquare(ctrl, file, rank, piece);
    });

    rows.push(
      h(
        'div',
        {
          attrs: {
            role: 'row',
          },
        },
        rowCells,
      ),
    );
  });

  return rows;
};

const renderSquare = (
  ctrl: PgnViewer,
  file: string,
  rank: number,
  piece?: { role: Role; color: string },
): VNode => {
  const ariaLabel = formatSquareForScreenReader(
    ctrl.translate,
    file,
    rank,
    piece?.role,
    piece?.color as 'white' | 'black',
  );

  return h(
    'span',
    {
      attrs: {
        role: 'gridcell',
        'aria-label': ariaLabel,
      },
    },
    ariaLabel,
  );
};
