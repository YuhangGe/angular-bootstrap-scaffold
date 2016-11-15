const _util = require('./_util');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.jpg': 'image/jpg',
  '.bmp': 'image/bmp',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.json': 'application/json; charset=utf-8'
};

const cache = new Map();

module.exports = function (paths, options = {}) {
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  const opts = {
    maxAge: options.maxAge || 60 * 60 * 1000,
    gzip: !!options.gzip,
    next: options.next !== false,
    index: 'index.html'
  };
  const config = _util.getConfig();
  paths = paths.map(p => path.resolve(config.CWD, p));
  return function *(request, response) {
    let url = request.url;
    let file = null;
    let stat = null;
    let isGZ = false;
    for(let i = 0; i < paths.length; i++) {
      stat = null;
      file = null;
      while(true) {
        try {
          file = path.join(paths[i], url);
          stat = yield _util.stat(file);
        } catch(ex) {
          if (['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'].indexOf(ex.code) < 0) {
            throw ex;
          }
          stat = null;
          file = null;
          break;
        }
        if (stat && stat.isDirectory()) {
          url = path.join(url, opts.index);
        } else {
          break;
        }
      }
      if (stat && stat.isFile()) {
        break;
      }
    }
    if (!stat) {
      return false;
    }
    // console.log('found', file);
    // if (opts.gzip && !/\.gz$/.test(file)) {
      // try {
      //   let gStat = yield _util.stat(file + '.gz');
      //   if (gStat.isFile()) {
      //     file += '.gz';
      //     stat = gStat;
      //     isGZ = true;
      //     // console.log('found gz', file);
      //   }
      // } catch(ex) {
      //   if (['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'].indexOf(ex.code) < 0) {
      //     throw ex;
      //   }
      // }
    // }

    let mt = request.headers['if-modified-since'];
    if (mt && opts.maxAge > 0) {
      if (mt === stat.mtime.toUTCString()) {
        // console.log('not modified');
        response.writeHead(304);
        response.end();
        return true;
      }
    }

    let f = cache.get(file);
    if (!f || f.mtime !== stat.mtime.toUTCString()) {
      f = {
        mtime: stat.mtime.toUTCString(),
        buffer: yield _util.readFile(file),
        gzip: null
      };
      cache.set(file, f);
    }

    if (opts.gzip) {
      if (f.gzip === null) {
        let out = yield new Promise((resolve, reject) => {
          zlib.gzip(f.buffer, (err, output) => {
            if (err) {
              reject(err);
            } else {
              resolve(output);
            }
          });
        });
        if (out.length < f.buffer.length) {
          f.gzip = out;
        } else {
          f.gzip = false;
        }
      }
      f.gzip !== false && response.setHeader('Content-Encoding', 'gzip');
    }
    response.setHeader('Last-Modified', f.mtime);
    response.setHeader('Content-Length', f.gzip !== false ? f.gzip.length : f.buffer.length);
    response.setHeader('Cache-Control', 'max-age=' + (opts.maxAge / 1000 | 0));
    response.setHeader('Content-Type', TYPES[path.extname(path.basename(file, '.gz'))] || 'application/octet-stream');
    response.end(f.gzip !== false ? f.gzip : f.buffer);
    return true;
  }
};
