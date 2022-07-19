import { Color } from 'chessops';
import { Config as CgConfig } from 'chessground/config';

export type FEN = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export type Translate = (key: string) => string;

export interface Node {
  fen: FEN;
  check: boolean;
  san?: San;
  uci?: Uci;
  ply: number;
}

export interface Opts {
  pgn: string;
  chessground?: CgConfig;
  orientation?: Color;
  showMoves?: boolean;
  initialPly?: number | 'last';
  translate?: Translate;
  scrollToMove?: boolean;
}
