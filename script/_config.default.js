'use strict';
const path = require('path');
const CWD = process.cwd();
const pkg = require('../package.json');
const PORT = process.env['PORT'] || 8080;
const noColor = !!process.env['NO_COLOR'] || process.env['TERM'] === 'dumb';
const noCompress = !!process.env['NO_COMPRESS'];

module.exports = {
  CWD,
  noColor,
  noCompress,
  proxyEnabled: true,
  proxyTimeout: 10000,
  proxyRules: {
    '/api/': 'http://127.0.0.1:8000'
  },
  publishRoot: './dist',
  srcRoot: path.join(CWD, 'src'),
  distRoot: path.join(CWD, 'dist'),
  tmpRoot: path.join(CWD, '.tmp'),
  copyFonts: ['node_modules/bootstrap/fonts'],
  pkg: {
    name: pkg.name,
    version: pkg.version
  },
  server: {
    host: '0.0.0.0',
    port: PORT
  },
  libraryMap: {
    // want to know usage of libraryMap ? ask Yuhang Ge...
  }
};