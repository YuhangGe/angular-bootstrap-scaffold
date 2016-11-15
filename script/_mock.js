const _util = require('./_util');
const cache = new Map();
const path = require('path');

module.exports = function () {

  return function *(request, response) {
    let config = _util.getConfig();
    if (!config.mockEnabled) {
      return false;
    }
    let _mm = config.mockMatch || [];
    let _found = false;
    let _url = request.url;
    for(let i = 0; i < _mm.length; i++) {
      if (_url.startsWith(_mm[i])) {
        _url = _url.substring(_mm[i].length - 1);
        _found = true;
        break;
      }
    }
    if (!_found) {
      return false;
    }
    let file = path.join(config.mockDir, _url);
    let stat = null;
    let _try = file;
    let _tries = ['', '.js', '.json'];
    for(let i = 0; i < _tries.length; i++) {
      _try = file + _tries[i];
      if (!(yield _util.exists(_try))) {
        continue;
      }
      try {
        stat = yield _util.stat(_try);
        break;
      } catch (ex) {
        if (['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'].indexOf(ex.code) < 0) {
          throw ex;
        }
      }
    }
    if (!stat) {
      return false;
    }
    let _mtime = cache.get(_try);
    if (!_mtime || _mtime !== stat.mtime.toUTCString()) {
      delete require.cache[_try];
      cache.set(_try, stat.mtime.toUTCString());
    }
    let m = require(_try);
    let result = m;
    if (typeof m === 'function') {
      if (m.constructor.name === 'GeneratorFunction') {
        result = yield m(request, response);
      } else {
        result = m(request, response);
      }
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(result));
    return true;
  }
};