import { Translate } from './interfaces';

export default function translate(translator?: Translate) {
  return translator || defaultTranslator;
}

const defaultTranslator = (key: string) => defaultTranslations[key] || key;

const defaultTranslations: { [key: string]: string } = {
  flipTheBoard: 'Flip the board',
  analysisBoard: 'Analysis board',
  practiceWithComputer: 'Practice with computer',
  getPgn: 'Get PGN',
  download: 'Download',
  viewOnLichess: 'View on Lichess',
  viewOnSite: 'View on site',
};
