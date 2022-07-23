import { Node, Game as ChessopsGame } from 'chessops/pgn';
import { MoveNode, RootNode } from './interfaces';
import { Path } from './path';

// immutable
export class Game implements ChessopsGame<MoveNode> {
  mainline: MoveNode[];

  constructor(
    readonly root: RootNode,
    readonly moves: Node<MoveNode>,
    readonly headers: Map<string, string>,
    readonly comments?: string[]
  ) {
    this.mainline = Array.from(this.moves.mainline());
  }

  find = (path: Path): MoveNode | undefined => undefined;
}
