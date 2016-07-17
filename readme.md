![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# seneca-token

[![Build Status][travis-badge]][travis-url]
[![Gitter][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

## install

To install, simply use npm. Remember you will need to install [Seneca.js][] if you haven't already.

```sh
> npm install seneca
> npm install seneca-cache
> npm install seneca-token
```


## usage

```js
var Seneca = require('seneca')
var SenecaCache = require('seneca-cache')
var SenecaToken = require('seneca-token')

var si = Seneca()
si
    .use(SenecaCache)
    .use(SenecaToken)

si.ready(function () {
    // access plugin features
})
```

## commands

### 1. role:token, cmd: generate

Generates token in base62 string with default length is 40 characters

```js
si.act('role:token, cmd:generate', function (err, respond) {
    console.log(respond.token)
})
```

#### 1.1. length: { type$: number, default$: 40, gte$: 10, lte$: 256 }

```js
si.act('role:token, cmd:generate, length: 64', function (err, respond) {
  console.log(respond.token)
})
```

#### 1.2. chars: { type$: string, default$: \'default\'}

See https://github.com/sehrope/node-rand-token

```js
si.act('role:token, cmd:generate, chars: a-z', function (err, respond) {
  console.log(respond.token)
})
```

#### 1.3. data: { type$: any, default$: undefined }

Generate and save data to entity `-/sys/token`, default duration: 600 seconds, see argument duration

```js
si.act('role:token, cmd:generate, data: any', function (err, respond) {
  console.log(respond.token)
  console.log(respond.data)
  console.log(respond.expiration)
})
```

#### 1.4. duration: { type$: number, default$: 600, min$: 10 }

Depends on argument `data`, set live duration of the token

```js
si.act('role:token, cmd:generate, data: any, duration: 100', function (err, respond) {
  console.log(respond.token)
  console.log(respond.data)
  console.log(respond.expiration)
})
```

#### 1.5. expired_at: { type$: ISO-8601-String, default$: undefined, min$: now() }

Depends on argument `data`, set strict expiration

```js
var Moment = require('moment')
var expiration = Moment().add(100, 'days').toISOString()
si.act('role:token, cmd:generate, data: any, expiration:' + expiration, function (err, respond) {
  console.log(respond.token)
  console.log(respond.data)
  console.log(respond.expiration)
})
```

#### 1.6. cache: { type$: boolean, default$: false }

Depends on argument `data`, use [seneca-cache](https://github.com/senecajs/seneca-cache)
plugin to store instead of entity (can use
[seneca-memcached](https://github.com/rjrodger/seneca-memcached) or
[seneca-redis-cache](https://github.com/senecajs/seneca-redis-cache)).

```js
si.act('role:token, cmd:generate, data: any, cache: true', function (err, respond) {
  console.log(respond.token)
  console.log(respond.data)
  console.log(respond.expiration)
})
```

### 2. cmd:check, token: string,required$

Check the token and get back data. If the token has no data, always fail.

#### 2.1. respond { ok: false, why: 'not-found' } if token is not found

```js
si.act('role:token, cmd:check, token:not-found', function (err, respond) {
  console.log(respond)
})
```

#### 2.2. respond { ok: false, why: 'expired' } if token has expired

```js
si.act('role:token, cmd:check, token:not-found', function (err, respond) {
  console.log(respond)
})
```

#### 2.3. respond { ok: true, data: any } if valid token and has data

```js
var Moment = require('moment')
var expiration = Moment().add(1, 'second').toISOString()
si.act({role: 'token', cmd: 'generate', data: true, expired_at: expiration}, function (err, respond) {
    setTimeout(function () {
      si.act({role: 'token', cmd: 'check', token: respond.token}, function (err, respond) {
        console.log(respond)
      })
    }, 1100)
})
```

#### 2.4. cache: {type$: boolean, default$: false}

if argument `cache` equals true, skipped check data in entity, find in cache only

```js
si.act('role:token, cmd:generate, data: true, cache: true', function (err, respond) {
  si.act({role: 'token', cmd: 'check', token: respond.token, cache: true}, function (err, respond) {
    console.log(respond)
  })
})
```

### 3. cmd:extend, token: string,required$

Extend existing token, update new expiration

#### 3.1. respond { ok: false, why: 'not-found' } if token is not found

```js
si.act('role:token, cmd:extend, token:not-found', function (err, respond) {
  console.log(respond)
})
```

#### 3.2. respond { ok: false, why: 'expired' } if token had expired

```js
var Moment = require('moment')
var expiration = Moment().add(1, 'second').toISOString()
si.act({role: 'token', cmd: 'generate', data: true, expired_at: expiration}, function (err, respond) {
    setTimeout(function () {
      si.act({role: 'token', cmd: 'extend', token: respond.token}, function (err, respond) {
        console.log(respond)
      })
    }, 1100)
})
```

#### 3.3. respond { ok: true, data: any, expiration: { type$: string }, cache: boolean } if token is valid and have been extended successfully

```js
si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
    si.act({role: 'token', cmd: 'extend', token: respond.token}, function (err, respond) {
        console.log(respond)
    })
})
```

#### 3.4. duration: { type$: number, default$: 600, min$: 10 }

Set new expiration = now() + duration

```js
si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
  si.act({role: 'token', cmd: 'extend', token: respond.token, duration: 600}, function (err, respond) {
    console.log(respond)
  })
})
```

#### 3.5. expired_at: { type$: ISO-8601-String, default$: undefined, min$: now() }

Set strict expiration to existing token

```js
var Moment = require('moment'_
si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
  var expiration = Moment().add(200, 's').toISOString()
  si.act({role: 'token', cmd: 'extend', token: respond.token, expired_at: expiration}, function (err, respond) {
    console.log(respond)
  })
})
```

#### 3.6. cache: { type$: boolean, default$: false }

Update in cache only, skipped check in entity

```js
si.act({role: 'token', cmd: 'generate', data: true, cache: true}, function (err, respond) {
    si.act({role: 'token', cmd: 'extend', token: respond.token, cache: true}, function (err, respond) {
        console.log(respond)
    })
})
```

### 4. cmd:clear, token: string,required$

Clear existing token, do not depend token is stored in entity or cache

```js
si.act('role:token, cmd:generate, data: true, duration: 10', function (err, respond) {
    var token = respond.token
    si.act('role: token, cmd: clear, token: ' + token, function(err, respond) {
        si.act('role: token, cmd: check, token: ' + token, function(err, respond) {
            console.log(respond)
        })
    })
})
```

## entity

This plugin use only one entity `-/sys/token` for storing token with data. If token was generated
with cache argument, it will be stored in cache, not in entity.

## cache plugins supported

* [seneca-cache](https://github.com/senecajs/seneca-cache)
* [seneca-memcached](https://github.com/rjrodger/seneca-memcached)
* [seneca-redis-cache](https://github.com/senecajs/seneca-redis-cache)

## note

Because this plugin depends on cache plugin, it need a {strict: {result: false}} option to run smoothly

## test

To run tests, simply use npm:

```sh
> npm run test
```


[Seneca.js]: https://www.npmjs.com/package/seneca
[travis-badge]: https://travis-ci.org/timugz/seneca-token.svg
[travis-url]: https://travis-ci.org/timugz/seneca-token
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/timugz/seneca-plugins
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard
