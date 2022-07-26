import { Color, Move, Position } from 'chessops';
import { Config as CgConfig } from 'chessground/config';
import { FEN } from 'chessground/types';
import { Path } from './path';
import { DrawShape } from 'chessground/draw';
import { CommentShape } from 'chessops/pgn';

export type Id = string;
export type San = string;
export type Uci = string;
export type Ply = number;

export type Translate = (key: string) => string;

export type Clocks = {
  white?: number;
  black?: number;
};

interface InitialOrMove {
  fen: FEN;
  check: boolean;
  comments: string[];
  shapes: CommentShape[];
  clocks: Clocks;
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
  startingComments: string[];
  nags: number[];
  emt?: number;
}

export interface Player {
  name?: string;
  title?: string;
  rating?: number;
}
export interface Players {
  white: Player;
  black: Player;
}

export type Pane = 'board' | 'menu' | 'pgn';

export interface Comments {
  texts: string[];
  shapes: CommentShape[];
  clock?: number;
  emt?: number;
}

export interface Opts {
  pgn: string;
  chessground: CgConfig;
  orientation: Color;
  showPlayers: boolean;
  showMoves: boolean;
  showClocks: boolean;
  initialPly: number | 'last';
  scrollToMove: boolean;
  translate?: Translate;
}
