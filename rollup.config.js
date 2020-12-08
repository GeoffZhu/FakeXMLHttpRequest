import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

const config = {
  input: './src/index.js',
  output: {
    file: './dist/index.js',
    format: 'umd',
    name: 'FakeXHR'
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
      plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods']
    }),
    nodeResolve({
      browser: true
    }),
    commonjs()
  ]
};

export default config