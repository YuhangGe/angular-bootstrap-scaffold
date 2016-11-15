const less = require('less');
const _util = require('./_util');
const path = require('path');
const LessPluginCleanCSS = require('less-plugin-clean-css');
const cleanCSSPlugin = new LessPluginCleanCSS({ advanced: true });

module.exports = function (isDev = true) {
  return function *() {
    let config = _util.getConfig();
    let filename = `${config.pkg.name}`;
    let mapname = `${filename}.css.map`;
    let cnt = yield _util.readFile(path.join(config.srcRoot, 'style/index.less'), 'utf-8');
    let result = yield less.render(cnt, {
      paths: [ path.join(config.srcRoot, 'style') ],
      plugins: (isDev || config.noCompress) ? [] : [ cleanCSSPlugin ],
      sourceMap: (isDev || config.noCompress) ? {
        sourceMapBasepath: path.join(config.srcRoot, 'style'),
        sourceMapURL: mapname
      } : false
    });
    if (!isDev) {
      filename += '-' + (yield _util.calcFileHash(result.css)) + '.min.css';
    } else {
      filename += '.css';
    }
    let dir = path.join(config.CWD, isDev ? '.tmp' : 'dist/css');
    yield _util.mkdir(dir, true);
    yield _util.writeFile(path.join(dir, filename), result.css);
    if ((isDev || config.noCompress) && result.map) {
      yield _util.writeFile(path.join(dir, mapname), result.map);
    }
    console.log(`Generate CSS ${filename.green}`);
    return {
      main: `css/${filename}`
    };
  }
};
