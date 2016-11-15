const _util = require('./_util');
const path = require('path');
const UglifyJS = require('uglify-js');
const CleanCSS = require('clean-css');

let LIVE_CODE = '';

const JS_LIB_REGEXP = /<!--\s*js\s+libs\s*-->([\d\D]+?)<!--\s*end\s+libs\s*-->/i;
const CSS_LIB_REGEXP = /<!--\s*css\s+libs\s*-->([\d\D]+?)<!--\s*end\s+libs\s*-->/i;

function create(isDev = true) {

  return function *(CSS_FILES, JS_FILES) {
    let config = _util.getConfig();
    if (!LIVE_CODE) {
      LIVE_CODE = (
        yield _util.readFile(path.join(config.CWD, 'script/_live_reload_client.js'), 'utf-8')
      ).replace(
        '$$PORT$$',
        () => config.server.port
      );
    }
    let html = yield _util.readFile(path.join(config.srcRoot, 'index.htm'), 'utf-8');

    if (isDev) {
      let idx = html.indexOf('<head>');
      html = html.substring(0, idx + 6) + '\n<script>\n' + LIVE_CODE + '\n</script>\n' + html.substring(idx + 6);
    }

    html = html.replace(_util.DEBUG_IF_REGEXP, (m0, m1, m2) => {
      return isDev ? m1 : m2;
    });

    if (!isDev) {
      for(let fn in CSS_FILES) {
        html = html.replace(new RegExp(`\\{\\{\\s*CSS_FILES\.${fn}\\s*\\}\\}`, 'g'), CSS_FILES[fn]);
      }
      for(let fn in JS_FILES) {
        html = html.replace(new RegExp(`\\{\\{\\s*JS_FILES\.${fn}\\s*\\}\\}`, 'g'), JS_FILES[fn]);
      }


      html = yield handleLibs(html, config, 'js');
      html = yield handleLibs(html, config, 'css');

      yield _util.writeFile(path.join(config.distRoot, 'index.html'), html);
      console.log('Generate HTML', 'index.html'.green);

    } else {
      console.log(create.HTML ? 'Update' : 'Generate', 'HTML');
    }

    create.HTML = html;
  }

}

function *handleLibs(html, config, type = 'js') {
  let m = html.match(type === 'js' ? JS_LIB_REGEXP : CSS_LIB_REGEXP);
  if (m) {
    let result = yield replaceLibs(m[1], config, type);
    let libs = result.map(fn => type === 'js' ? `<script src="lib/${fn}"></script>` : `<link rel="stylesheet" href="lib/${fn}"/>`).join('\n');
    html = html.substring(0, m.index) + libs + html.substring(m.index + m[0].length);
  }
  return html;
}
create.HTML = '';

function *replaceLibs(str, config, type = 'js') {
  let ls = str.split('\n').map(r => r.trim()).filter(r => !!r);
  let nm = 'node_modules/';
  yield _util.mkdir(path.join(config.distRoot, 'lib'));
  let libs = [];
  let pArr = [];
  for(let i = 0; i < ls.length; i++) {
    let file = ls[i].match(type === 'js' ? /src=(?:\'|\")([^\'\"]+)/ : /href=(?:\'|\")([^\'\"]+)/)[1];
    let idx = file.indexOf('/', nm.length);
    let lib = file.substring(nm.length, idx);
    let libPkg = require(path.join(config.CWD, nm, lib, 'package.json'));
    let version = libPkg.version;
    let minFile;
    let bn;
    file = path.join(config.CWD, file);
    let dir = path.dirname(file);
    if (config.libraryMap.hasOwnProperty(lib)) {
      minFile = path.resolve(dir, config.libraryMap[lib]);
      bn = path.basename(minFile, `.${type}`);
      if (config.noCompress) {
        minFile = file;
      } else {
        let exists = yield _util.exists(minFile);
        if (!exists) {
          throw new Error(minFile, 'not found, please check libraryMap config.');
        }
      }
    } else {
      bn = path.basename(file, `.${type}`);
      minFile = path.join(dir, `${bn}.min.${type}`);
      if (config.noCompress) {
        minFile = file;
      } else {
        let exists = yield _util.exists(minFile);
        if (!exists) {
          minFile = yield minLib(file, bn, version, config, type);
        }
      }
    }
    bn = `${bn}-${version}.min.${type}`;
    pArr.push(_util.copy(minFile, path.join(config.distRoot, 'lib', bn)));
    libs.push(bn);
  }

  yield pArr;
  console.log('Copied lib', libs.join(', ').green);

  return libs;
}

function *minLib(file, bn, version, config, type) {
  yield _util.mkdir(path.join(config.tmpRoot, 'lib'));
  let minFile = path.join(config.tmpRoot, 'lib', `${bn}-${version}.min.${type}`);
  let exists = yield _util.exists(minFile);
  if (exists) {
    return minFile;
  }
  console.log(`${bn}-${version}.min.${type}`.yellow,  `not found, use ${type === 'js' ? 'uglify-js' : 'clean-css'} to generate it.`);
  let result = '';
  if (type === 'js')  {
    result = UglifyJS.minify(file).code;
  } else {
    let source = yield _util.readFile(file, 'utf-8');
    result = new CleanCSS().minify(source).styles;
  }
  if (result) {
    yield _util.writeFile(minFile, result);
  }
  return minFile;
}

module.exports = create;
