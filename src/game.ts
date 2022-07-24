import { Position } from 'chessops';
import { Node, ChildNode, Game as ChessopsGame } from 'chessops/pgn';
import { Id, Initial, MoveData } from './interfaces';
import { Path } from './path';

export type AnyNode = Node<MoveData>;
export type MoveNode = ChildNode<MoveData>;

// immutable
export class Game implements ChessopsGame<MoveData> {
  mainline: MoveData[];

  constructor(readonly initial: Initial, readonly moves: AnyNode, readonly headers: Map<string, string>) {
    this.mainline = Array.from(this.moves.mainline());
  }

  nodeAt = (path: Path): AnyNode | undefined => {
    if (path.empty()) return this.moves;
    const tree = this.moves.children.find(c => c.data.path.path == path.head());
    return tree && nodeAtPathFrom(tree, path.tail());
  };

  dataAt = (path: Path): MoveData | Initial | undefined => {
    const node = this.nodeAt(path);
    return node ? (isMoveNode(node) ? node.data : this.initial) : undefined;
  };
}

const childById = (node: MoveNode, id: Id) => node.children.find(c => c.data.path.last() == id);

const nodeAtPathFrom = (node: MoveNode, path: Path): Node<MoveData> => {
  if (path.empty()) return node;
  const child = childById(node, path.head());
  return child ? nodeAtPathFrom(child, path.tail()) : node;
};

export const isMoveNode = (n: AnyNode): n is MoveNode => 'data' in n;
export const isMoveData = (d: MoveData | Initial): d is MoveData => 'uci' in d;
