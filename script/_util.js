'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const crypto = require('crypto');

const DEBUG_IF_REGEXP = /\<\!--\s+if\s+debug\s+--\>([\d\D]+?)\<\!--\s+else\s+--\>([\d\D]+?)\<\!--\s+end\s+if\s+--\>/ig;

function wrapFnPromise(fn, ctx = null) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      args.push(function(err, ...rtn) {
        if (err) {
          reject(err);
        } else {
          resolve(...rtn);
        }
      });
      fn.call(ctx || this, ...args);
    });
  }
}

var exists = function (file) {
  return new Promise((resolve) => {
    fs.access(file, err => {
      resolve(err ? false : true);
    });
  });
};


function mkdir(dir, loop = false) {
  return new Promise((resolve, reject) => {
    exists(dir).then(exist => {
      if (exist) {
        resolve();
      } else {
        if (loop) {
          let pDir = path.dirname(dir);
          mkdir(pDir, true).then(() => {
            fs.mkdir(dir, err => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }, reject);
        } else {
          fs.mkdir(dir, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      }
    })
  });
}

function copy(source, target) {
  return new Promise(function(resolve, reject) {
    let rd = fs.createReadStream(source);
    rd.on('error', reject);
    let wr = fs.createWriteStream(target);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  });
}

function escapeHtml(string) {
  return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case '"':
      case "'":
      case '\\':
        return '\\' + character;
      // Four possible LineTerminator characters need to be escaped:
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\u2028':
        return '\\u2028';
      case '\u2029':
        return '\\u2029';
    }
  });
}

function deepMerge(dst, src) {
  if (!src) {
    src = dst;
    dst = {};
  }
  for(var k in src) {
    var v = src[k];
    if (!dst.hasOwnProperty(k) || typeof dst[k] !== 'object' || typeof v !== 'object') {
      dst[k] = v;
    } else {
      deepMerge(dst[k], v);
    }
  }
  return dst;
}

let CONFIG = null;
function getConfig() {
  if (!CONFIG) {
    const _config = require('./_config.default.js');
    try {
      deepMerge(_config, require('./_config.custom.js'));
    } catch(ex) {
      // ignore
    }
    CONFIG = _config;
  }
  return CONFIG;
}

fs.watch(__dirname, {
  persistent: false,
  recursive: true
}, (type, file) => {
  let bn = path.basename(file);
  if (bn.startsWith('_config')) {
    console.log('Reload config file');
    CONFIG = null;
    getConfig();
  }
});

function execCommand(...args) {
  return new Promise((resolve, reject)=> {
    exec(...args, (err, stdout, stderr) => {
      if (err) {
        reject(err.message);
      } else if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout || '');
      }
    });
  });
}

var readFile = wrapFnPromise(fs.readFile);

function *calcFileHash(file) {
  let cnt = file;
  if (typeof file === 'string' && file.indexOf('\n') < 0 && /\.[a-z0-9]+$/i.test(file)) {
    cnt = yield readFile(file);
  }
  let hash = crypto.createHash('md5');
  hash.update(cnt);
  return hash.digest('hex');
}

module.exports = {
  DEBUG_IF_REGEXP,
  exec: execCommand,
  getConfig,
  wrapFnPromise,
  exists,
  mkdir,
  copy,
  escapeHtml,
  deepMerge,
  stat: wrapFnPromise(fs.stat),
  readdir: wrapFnPromise(fs.readdir),
  readFile,
  writeFile: wrapFnPromise(fs.writeFile),
  calcFileHash
};
