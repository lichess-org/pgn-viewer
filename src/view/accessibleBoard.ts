import { h, VNode } from 'snabbdom';
import PgnViewer from '../pgnViewer';
import { formatSquareForScreenReader } from './util';
import { files, Key, Piece, Rank, ranks } from 'chessground/types';
import { Translate } from '../interfaces';
import { invRanks } from 'chessground/util';
import { read as readFen } from 'chessground/fen';

export const renderAccessibleBoard = (ctrl: PgnViewer): VNode => {
  const flipped = ctrl.flipped;

  return h(
    'div.lpv__sr-only',
    {
      attrs: {
        role: 'grid',
        'aria-label': ctrl.translate('aria.accessibleChessboard'),
        'aria-hidden': 'false',
      },
    },
    renderBoardRows(ctrl, flipped),
  );
};

const renderBoardRows = (ctrl: PgnViewer, flipped: boolean): VNode[] => {
  const pieces = ctrl.ground?.state.pieces || readFen(ctrl.curData().fen);

  const orderedRanks = flipped ? ranks : invRanks;
  const orderedFiles = flipped ? [...files].reverse() : files;

  return orderedRanks.map(rank =>
    h(
      'div',
      {
        attrs: {
          role: 'row',
        },
      },
      orderedFiles.map(file => {
        const squareKey = `${file}${rank}` as Key;
        const piece = pieces.get(squareKey);
        return renderSquare(ctrl.translate, file, rank, piece);
      }),
    ),
  );
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
