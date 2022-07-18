import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import scss from 'rollup-plugin-scss';
import sass from 'sass';

export default args => ({
  input: 'src/main.ts',
  output: {
    file: args['config-prod'] ? 'dist/lichess-pgn-viewer.min.js' : 'demo/lichess-pgn-viewer.js',
    format: 'iife',
    name: 'LichessPgnViewer',
    plugins: args['config-prod']
      ? [
          terser({
            safari10: false,
            output: { comments: false },
          }),
        ]
      : [],
  },
  plugins: [
    resolve(),
    typescript(),
    commonjs(),
    scss({
      include: ['scss/*'],
      output: args['config-prod'] ? './dist/lichess-pgn-viewer.min.css' : './demo/lichess-pgn-viewer.css',
      runtime: sass,
      ...(args['config-prod'] ? { outputStyle: 'compressed' } : {}),
    }),
  ],
});
