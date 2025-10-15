import { Translator } from './interfaces';

const defaultTranslator: Translator = (key: string) => defaultTranslations[key];

export default function translate(translator = defaultTranslator) {
  return (key: string, ...args: string[]) => interpolate(translator(key) ?? key, args);
}

const interpolate = (str: string, args: string[]): string => {
  let result = str;
  args.forEach((arg, index) => {
    result = result.replace(`%${index + 1}$s`, arg);
    result = result.replace('%s', arg);
  });
  return result;
};

const defaultTranslations: { [key: string]: string } = {
  flipTheBoard: 'Flip the board',
  analysisBoard: 'Analysis board',
  practiceWithComputer: 'Practice with computer',
  getPgn: 'Get PGN',
  download: 'Download',
  viewOnLichess: 'View on Lichess',
  viewOnSite: 'View on site',
  menu: 'Menu',
  'aria.first': 'Go to first move',
  'aria.prev': 'Go to previous move',
  'aria.next': 'Go to next move',
  'aria.last': 'Go to last move',
  'aria.gameMoves': 'Game moves',
  'aria.gameResult': 'Game result',
  'aria.variation': 'Variation',
  'aria.navigationControls': 'Game navigation controls',
  'aria.viewProfileOnLichess': "View %s's profile on Lichess",
  'aria.chessGameBetween': 'Chess game between %1$s, whites, and %2$s, blacks. %3$s',
  'aria.gameInProgress': 'Game in progress',
  'aria.whitesWin': 'Whites win',
  'aria.blacksWin': 'Blacks win',
  'aria.draw': 'Draw',
  'aria.unknownPlayer': 'Unknown player',
  'aria.rated': 'rated %s',
  'aria.move': 'Move %1$s, %2$s, %3$s',
  'aria.white': 'white',
  'aria.black': 'black',
  'aria.remaining': '%s remaining',
  'aria.linkOpensInNewTab': '%s, link, opens in new tab',
  'aria.accessibleChessboard': 'Accessible chessboard',
  'aria.piece.king': 'king',
  'aria.piece.queen': 'queen',
  'aria.piece.rook': 'rook',
  'aria.piece.bishop': 'bishop',
  'aria.piece.knight': 'knight',
  'aria.piece.pawn': 'pawn',
  'aria.empty': 'empty',
  'san.takes': 'takes',
  'san.check': 'check',
  'san.checkmate': 'checkmate',
  'san.promotesTo': 'promotes to',
  'san.droppedOn': 'dropped on',
  'san.longCastling': 'long castling',
  'san.shortCastling': 'short castling',
};
