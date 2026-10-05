import { type ChildNode, type Node } from 'chessops/pgn';

import {
  type Id,
  type Initial,
  type InitialOrMove,
  type Metadata,
  type MoveData,
  type Players,
  type Ply,
} from './interfaces';
import { Path } from './path';

export type AnyNode = Node<MoveData>;
export type MoveNode = ChildNode<MoveData>;

// immutable
export class Game {
  mainline: MoveData[];

  constructor(
    readonly initial: Initial,
    readonly moves: AnyNode,
    readonly players: Players,
    readonly metadata: Metadata,
  ) {
    this.mainline = Array.from(this.moves.mainline());
    markRepetitions(this.initial, this.mainline);
  }

  nodeAt = (path: Path): AnyNode | undefined => nodeAtPathFrom(this.moves, path);

  dataAt = (path: Path): MoveData | Initial | undefined => {
    const node = this.nodeAt(path);
    return node ? (isMoveNode(node) ? node.data : this.initial) : undefined;
  };

  title = () =>
    this.players.white.name
      ? [
          this.players.white.title,
          this.players.white.name,
          'vs',
          this.players.black.title,
          this.players.black.name,
        ]
          .filter(x => x && !!x.trim())
          .join('_')
          .replace(' ', '-')
      : 'lichess-pgn-viewer';

  pathAtMainlinePly = (ply: Ply | 'last') =>
    ply === 0
      ? Path.root
      : this.mainline[Math.max(0, Math.min(this.mainline.length - 1, ply === 'last' ? 9999 : ply - 1))]
          ?.path || Path.root;

  hasPlayerName = () => !!(this.players.white?.name ?? this.players.black?.name);
}

const childById = (node: AnyNode, id: Id): MoveNode | undefined =>
  node.children.find(c => c.data.path.last() === id);

const nodeAtPathFrom = (node: AnyNode, path: Path): AnyNode | undefined => {
  if (path.empty()) return node;
  const child = childById(node, path.head());
  return child ? nodeAtPathFrom(child, path.tail()) : undefined;
};

export const isMoveNode = (n: AnyNode): n is MoveNode => 'data' in n;
export const isMoveData = (d: InitialOrMove): d is MoveData => 'uci' in d;

export const fenToEpd = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

// for games that ended in a threefold (or fivefold) repetition, number the
// occurrences of the final position so they can be marked on the board
const markRepetitions = (initial: Initial, mainline: MoveData[]): void => {
  if (!mainline.length) return;
  const positions = [initial.fen, ...mainline.map(m => m.fen)];
  const finalEpd = fenToEpd(positions[positions.length - 1]);
  const occurrences: number[] = [];
  positions.forEach((fen, i) => {
    if (fenToEpd(fen) === finalEpd) occurrences.push(i);
  });
  if (occurrences.length < 3) return;
  occurrences.forEach((positionIndex, i) => {
    // we annonate the move that lead to the position
    const move = mainline[positionIndex - 1];
    // `move` may be undefined if it's the initial position that's repeated
    if (move) move.repetition = Math.min(i + 1, 5);
  });
};
