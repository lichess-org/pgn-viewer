import { Translate } from './interfaces';

export default function translate(translator?: Translate) {
  return (key: string) => (translator && translator(key)) || defaultTranslator(key);
}

const defaultTranslator = (key: string) => defaultTranslations[key];

const defaultTranslations: { [key: string]: string } = {
  flipTheBoard: 'Flip the board',
  analysisBoard: 'Analysis board',
  practiceWithComputer: 'Practice with computer',
  getPgn: 'Get PGN',
  download: 'Download',
  viewOnLichess: 'View on Lichess',
  viewOnSite: 'View on site',
  menu: 'Menu',
  first: 'Go to first move',
  prev: 'Go to previous move',
  next: 'Go to next move',
  last: 'Go to last move',
};
