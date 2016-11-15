const co = require('co');
const WSServer = require('websocket').server;
const http = require('http');
const url = require('url');
const HtmlGen = require('./_genHTML');
const path = require('path');
const _util = require('./_util');
const serve = require('./_static');
const mock = require('./_mock');

let liveReloadClients = [];
function reload() {
  liveReloadClients.forEach(connection => {
    connection.sendUTF('reload');
  });
}

function initLiveReload(server) {
  let ws = new WSServer({
    httpServer: server,
    autoAcceptConnections: false
  });
  ws.on('request', function(request) {
    let connection = request.accept('echo-protocol', request.origin);
    liveReloadClients.push(connection);
    connection.on('close', function() {
      let idx = liveReloadClients.indexOf(connection);
      liveReloadClients.splice(idx, 1);
    });
  });
}

function *handleUrl(request, response) {
  if (request.url === '/' || request.url === '/index.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(HtmlGen.HTML);
    return true;
  }
  request.url = request.url.replace(/^(\/node_modules\/)|(\/src\/)|(\/asset\/)/, '/');
}

function *handleProxy(request, response) {
  let config = _util.getConfig();
  if (!config.proxyEnabled) {
    return false;
  }
  let rules = config.proxyRules || {};
  console.log(rules);
  let remoteUrl = '';
  for(let prefix in rules) {
    if (request.url.startsWith(prefix)) {
      request.url = request.url.substring(prefix.length - 1);
      remoteUrl = rules[prefix];
      break;
    } 
  }
  if (!remoteUrl) {
    return false;
  }
  let remote = remoteUrl + request.url;
  let info = url.parse(remote);
  console.log(`Proxy => ${request.method.yellow} ${remote.green}`);
  let ended = false;
  let req = http.request({
    hostname: info.hostname,
    port: info.port || 80,
    method: request.method,
    path: info.path,
    headers: request.headers,
    timeout: config.proxyTimeout || 10000
  }, res => {
    if (ended) return;
    res.on('data', chunk => {
      if (ended) return;
      response.write(chunk);
    });
    res.on('end', () => {
      if (ended) return;
      ended = true;
      response.end();
    });
    res.on('error', _err)
  }).on('error', _err);
  request.on('data', chunk => {
    req.write(chunk);
  }).on('end', () => {
    if (ended) return;
    req.end();
  }).on('error', _err);

  function _err(err) {
    console.log(err);
    if (ended) return;
    ended = true;
    req.end();
    response.writeHead(500);
    response.end('Backend Connection Error.\n' + (err.stack || err.message || err.toString()));
  }
  return true;
}

let instance = null;

function createServer(isDev) {

  if (instance) {
    return instance;
  }

  let config = _util.getConfig();
  let middlewares = [];
  if (isDev) {
    middlewares.push(handleUrl);
    middlewares.push(serve([
      config.tmpRoot,
      config.srcRoot,
      path.join(config.CWD, 'node_modules')
    ], {
      gzip: false,
      maxAge: 1000
    }));
    middlewares.push(mock());
  } else {
    middlewares.push(serve(config.distRoot, {
      gzip: true,
      maxAge: 1000
    }));
  }
  middlewares.push(handleProxy);

  let server = http.createServer((request, response) => {
    co(function*() {
      let handled = false;
      for(let i = 0; i < middlewares.length; i++) {
        if (yield middlewares[i](request, response)) {
          handled = true;
          break;
        }
      }
      if (!handled) {
        response.writeHead(404);
        response.end();
      }
    }).catch(err => {
      response.writeHead(500);
      response.end();
      console.log(err);
    });
  });
  server.listen(config.server.port, config.server.host, () => {
    console.log('Dev Server Listening at', `${config.server.host}:${config.server.port}`.green);
  });
  if (isDev) {
    initLiveReload(server);
  }

  instance = {
    reload
  };
  return instance;
}

module.exports = createServer;

