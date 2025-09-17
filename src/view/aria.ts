import { isMoveData } from '../game';
import { Player } from '../interfaces';
import PgnViewer from '../pgnViewer';
import { clockContent, formatMoveForScreenReader } from './util';

export const renderAriaAnnouncement = (ctrl: PgnViewer): string => {
  const data = ctrl.curData();

  if (!isMoveData(data)) return '';

  const moveNumber = Math.ceil(data.ply / 2);
  const color = data.ply % 2 === 1 ? 'white' : 'black';
  const san = data.san;

  let announcement = ctrl.translate(
    'aria.move',
    moveNumber.toString(),
    ctrl.translate(`aria.${color}`),
    formatMoveForScreenReader(san, data.nags),
  );

  if (data.check) {
    announcement += ', ' + ctrl.translate('aria.check');
  }

  const clock = data.clocks && data.clocks[color === 'white' ? 'white' : 'black'];
  if (clock !== undefined && ctrl.opts.showClocks) {
    const clockTime = clockContent(clock).join('');
    if (clockTime !== '-') {
      announcement += ', ' + ctrl.translate('aria.remaining', clockTime);
    }
  }

  const comments = data.comments.join(' ').trim();
  if (comments) {
    announcement += `. ${comments}`;
  }

  return announcement;
};

export const renderRootAriaLabel = (ctrl: PgnViewer): string => {
  const game = ctrl.game;

  const formatPlayer = (player: Player): string => {
    let playerInfo = player.name || ctrl.translate('aria.unknownPlayer');
    if (player.title) {
      playerInfo = `${player.title} ${playerInfo}`;
    }
    if (player.rating) {
      playerInfo = `${playerInfo}, ${ctrl.translate('aria.rated', player.rating.toString())}`;
    }
    return playerInfo;
  };

  const formatResult = (result?: string): string => {
    if (!result || result === '*') return ctrl.translate('aria.gameInProgress');
    if (result === '1-0') return ctrl.translate('aria.whitesWin');
    if (result === '0-1') return ctrl.translate('aria.blacksWin');
    if (result === '1/2-1/2') return ctrl.translate('aria.draw');
    return result; // fallback for any other result format
  };

  const whiteName = formatPlayer(game.players.white);
  const blackName = formatPlayer(game.players.black);
  const result = formatResult(game.metadata.result);

  return ctrl.translate('aria.chessGameBetween', whiteName, blackName, result);
};
