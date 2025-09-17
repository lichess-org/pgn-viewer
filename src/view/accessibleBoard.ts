import { h, VNode } from 'snabbdom';
import PgnViewer from '../pgnViewer';
import { formatSquareForScreenReader } from './util';
import { parseFen } from 'chessops/fen';
import { parseSquare } from 'chessops';
import { files, Piece, Rank, ranks } from 'chessground/types';
import { Translate } from '../interfaces';
import { invRanks } from 'chessground/util';

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

  const setup = parseFen(fen);
  if (!setup.isOk) return rows;

  const orderedRanks = flipped ? ranks : invRanks;
  const orderedFiles = flipped ? [...files].reverse() : files;

  orderedRanks.forEach(rank => {
    const rowCells = orderedFiles.map(file => {
      const squareKey = `${file}${rank}`;
      const square = parseSquare(squareKey);
      const piece = square ? setup.value.board.get(square) : undefined;

      return renderSquare(ctrl.translate, file, rank, piece);
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

const renderSquare = (translate: Translate, file: string, rank: Rank, piece?: Piece): VNode => {
  const ariaLabel = formatSquareForScreenReader(translate, file, rank, piece);

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
