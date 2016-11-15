# hansight analysis

## Develop

````bash
$ npm install
$ npm run dev
````

## Build

````bash
$ npm run build
````

## Custom Config

create file `script/_config.custom.js`.
develop script will merge it with `script/_config.default.js`.

````js
module.exports = {
  // see 'script/_config.default.js' for all properties
  proxyRules: {
    '/api/': 'http://127.0.0.1:8000',
    '/elasticsearch/': 'http://127.0.0.1:9200'
  }
}
````