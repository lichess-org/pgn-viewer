import { Color, Move, Position } from 'chessops';
import { Config as CgConfig } from 'chessground/config';
import { FEN } from 'chessground/types';
import { Path } from './path';

export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export type Translate = (key: string) => string;

export interface Initial {
  pos: Position;
  fen: FEN;
  check: boolean;
}

export interface MoveData {
  path: Path;
  ply: number;
  fen: FEN;
  check: boolean;
  move: Move;
  san: San;
  uci: Uci;
  startingComments?: string[];
  comments: string[];
  nags: number[];
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
