import { DrawShape } from 'chessground/draw';
import { Key } from 'chessground/types';

type CommentAndShapes = [string, DrawShape[]];

export const parseComments = (comments: string[]): [string[], DrawShape[]] =>
  comments.reduce(
    ([strs, shapes], comment) => {
      const [str, sps] = parseComment(comment);
      return [[...strs, ...(str ? [str] : [])], shapes.concat(sps)];
    },
    [[], []]
  );

export const parseComment = (comment: string): CommentAndShapes => {
  const [s1, circles] = parseCircles(comment.trim());
  const [s2, arrows] = parseArrows(s1.trim());
  return [s2.trim().replace(/\s{2,}/g, ' '), [...circles, ...arrows]];
};

const parseCircles = (comment: string): CommentAndShapes => {
  const circles = Array.from(comment.matchAll(circlesRegex))
    .map(m => m[1])
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .map(s => ({
      orig: s.slice(1) as Key,
      brush: brushOf(s[0]),
    }));
  return [circles.length ? comment.replace(circlesRemoveRegex, '') : comment, circles];
};

const parseArrows = (comment: string): CommentAndShapes => {
  const arrows = Array.from(comment.matchAll(arrowsRegex))
    .map(m => m[1])
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .map(s => ({
      orig: s.slice(1, 3) as Key,
      dest: s.slice(3, 5) as Key,
      brush: brushOf(s[0]),
    }));
  return [arrows.length ? comment.replace(arrowsRemoveRegex, '') : comment, arrows];
};

const circlesRegex = /\[\%csl[\s\r\n]+((?:\w{3}[,\s]*)+)\]/g;
const circlesRemoveRegex = /\[\%csl[\s\r\n]+((?:\w{3}[,\s]*)+)\]/g;
const arrowsRegex = /\[\%cal[\s\r\n]+((?:\w{5}[,\s]*)+)\]/g;
const arrowsRemoveRegex = /\[\%cal[\s\r\n]+((?:\w{5}[,\s]*)+)\]/g;

const brushOf = (c: string) => (c == 'G' ? 'green' : c == 'R' ? 'red' : c == 'Y' ? 'yellow' : 'blue');
