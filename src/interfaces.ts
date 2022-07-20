import { Color } from 'chessops';
import { Config as CgConfig } from 'chessground/config';
import { Game } from 'chessops/pgn';
import { FEN } from 'chessground/types';

export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export type Translate = (key: string) => string;

export interface FullGame {
  root: RootNode;
  game: Game<MoveNode>;
}

export interface BaseNode {
  id: Id;
  ply: number;
  fen: FEN;
  check: boolean;
}

export interface RootNode extends BaseNode {
  id: '';
  ply: 0;
}

export interface MoveNode extends BaseNode {
  san: San;
  uci: Uci;
  startingComments?: string[];
  comments?: string[];
  nags?: number[];
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
