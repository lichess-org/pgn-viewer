import { Color, Move, Position } from 'chessops';
import { Config as CgConfig } from 'chessground/config';
import { FEN } from 'chessground/types';
import { Path } from './path';
import { DrawShape } from 'chessground/draw';

export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export type Translate = (key: string) => string;

interface InitialOrMove {
  fen: FEN;
  check: boolean;
  comments: string[];
  shapes: DrawShape[];
}

export interface Initial extends InitialOrMove {
  pos: Position;
}

export interface MoveData extends InitialOrMove {
  path: Path;
  ply: number;
  move: Move;
  san: San;
  uci: Uci;
  startingComments?: string[];
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
