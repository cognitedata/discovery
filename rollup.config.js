import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';
import pkg from './package.json';
export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript({
      typescript: require('typescript'),
    }),
    json({
      // All JSON files will be parsed by default,
      // but you can also specifically include/exclude files
      include: ['src/parsers/protobuf/proto/**', 'node_modules/**'],
      exclude: ['src/__tests__/fixtures/**'],

      // for tree-shaking, properties will be declared as
      // variables, using either `var` or `const`
      preferConst: false, // Default: false

      // specify indentation for the generated default export —
      // defaults to '\t'
      indent: '  ',

      // ignores indent and generates the smallest code
      compact: true, // Default: false

      // generate a named export for every property of the JSON object
      namedExports: true, // Default: true
    }),
  ],
};
