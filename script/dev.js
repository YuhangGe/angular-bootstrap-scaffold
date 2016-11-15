'use strict';
const _util = require('./_util');
const path = require('path');
const fs = require('fs');
const co = require('co');
const BUILD_MODE = (process.env['MODE'] || 'dev').toLowerCase();
const IS_DEV = BUILD_MODE === 'dev';
const exec = require('child_process').exec;

const genLess = require('./_genLess')(IS_DEV);
const genHTML = require('./_genHTML')(IS_DEV);
const genJS = require('./_genJS')(IS_DEV);

let server = null;

function _exit(err) {
  if (err) console.error(err);
  process.exit(0);
}

process.on('uncaughtException', _exit);

function onFileChange(type, file) {
  co(function *() {
    let ext = path.extname(file);
    if ('.htm' === ext) {
      yield genHtml();
    } else if ('.less' === ext) {
      yield genLess();
    } else if ('.js' === ext) {
      yield genJS();
    } else if ('.html' === ext) {
      yield genJS();
    }
    if (['.htm'].indexOf(ext) >= 0) {
      server.reload();
    }
  }).catch(_exit);
}

function *copyFonts(config, idDev) {
  let cmd = 'cp -R ';
  config.copyFonts.forEach(dir => {
    let fDir = path.resolve(config.CWD, dir);
    cmd += fDir + ' ';
  });
  cmd += path.join(config.distRoot, 'fonts');
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        // console.log(stdout);
        console.log('Fonts copied.');
        resolve();
      }
    })
  })
}

if (BUILD_MODE === 'dist-server') {
  require('colors');
  require('./_server')(false);
  return;
}

co(function *() {
  const startTime = Date.now();
  const config = _util.getConfig();
  if (config.noColor) {
    process.env.TERM = 'dumb';
  }
  require('colors');

  yield _util.mkdir(config.tmpRoot);
  yield _util.mkdir(config.distRoot);

  let results = yield [
    genLess(),
    genJS(),
    copyFonts(config, IS_DEV)
  ];

  yield genHTML(results[0], results[1]);

  if (IS_DEV) {
    let config = _util.getConfig();
    fs.watch(config.srcRoot, {
      persistent: false,
      recursive: true
    }, onFileChange);
    
    fs.watch(config.tmpRoot, {
      persistent: false,
      recursive: true
    }, (event, file) => {
      if (['.js', '.css'].indexOf(path.extname(file)) >= 0) {
        server.reload();
      }
    });
    server = require('./_server')(IS_DEV);
  } else {
    console.log(`\nBuild Finished in ${Math.round((Date.now() - startTime) / 1000 * 10) / 10}s`.blue);
  }
  
}).catch(_exit);
