const path = require('path');
const _util = require('./_util');
const rollup = require('rollup');
const string = require('rollup-plugin-string');

const _config = {
  entry: '',
  dest: '',
  format: 'iife',
  sourceMap: true,
  external: [
    'app'
  ],
  globals: {
    app: '__HansightApp'
  },
  plugins: [ string({
    include: 'src/**/*.html'
  }) ]
};

let babel = null;
let uglify = null;

module.exports = function (isDev = true) {
  let cache = null;
  
  return function *() {
    let config = _util.getConfig();
    let file = path.join(config.tmpRoot, config.pkg.name + '.js');
    _config.sourceMap = !!isDev;
    _config.dest = file;
    _config.entry = path.join(config.srcRoot, 'main.js');

    console.log('Start rollup packing' + (cache ? ' with cache' : '') + '...');
    let opt = Object.assign({}, _config, cache ? { cache } : {});
    yield rollup.rollup(opt).then(bundle => {
      cache = bundle;
      return bundle.write(_config);
    });
    console.log('Rollup finish.');
    if (isDev) {
      console.log('Rollup waiting for changes...');
      return;
    }

    if (!babel) {
      babel = require('babel-core'); // import it only if we use
      uglify = require('uglify-js');
    }

    yield _util.mkdir(path.join(config.distRoot, 'js'));
    let cnt = yield _util.readFile(file, 'utf-8');
    console.log('Start babel transforming...');
    let result = babel.transform(cnt, {
      babelrc: false,
      presets: ['es2015']
    });
    console.log('Babel finish.');
    if (!config.noCompress) {
      console.log('Start uglify compressing...');
      result = uglify.minify(result.code, {
        fromString: true
      });
      console.log('Uglify finish.');
    }

    let hash = yield _util.calcFileHash(result.code);
    let of = `${config.pkg.name}.${hash}.min.js`;
    yield _util.writeFile(path.join(config.distRoot, 'js', of), result.code);
    console.log('Generate JS', of.green);
    return {
      main: 'js/' + of
    };
  }
};
