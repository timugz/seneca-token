/* Copyright (c) 2016 timugz (timugz@gmail.com) */
'use strict'

var Moment = require('moment')
var extend = require('lodash').extend
var generator = require('rand-token').generator

module.exports = function () {
  var si = this

  var token_canon = 'sys/token'
  si.options({strict: {result: false}})

  function generate (length, chars) {
    return generator({chars: chars}).generate(length)
  }

  function cmd_generate (args, done) {
    var length = args.length || 40
    var chars = args.chars || ''

    if (length < 10) length = 10
    if (length > 256) length = 256

    if (args.data === undefined) {
      return done(null, {ok: true, token: generate(length, chars)})
    }

    var cache = args.cache || false

    var expiration = Moment()
    if (args.expired_at) {
      expiration = Moment(args.expired_at, Moment.ISO_8601)
    }
    else {
      var duration = args.duration || 600
      if (duration < 10) duration = 10
      expiration.add(duration, 's')
    }

    var id = generate(length, chars)
    var saved = {
      data: args.data,
      expiration: expiration.toISOString()
    }

    if (cache) {
      return save_data_to_cache(respond_result)
    }
    return save_data_to_entity(respond_result)


    function respond_result () {
      done(null, {ok: true, token: id, cache: cache, expiration: expiration.toISOString()})
    }

    function save_data_to_entity (next) {
      var tokenent = si.make(token_canon)
      var token = tokenent.make$(extend({}, {
        id$: id
      }, saved))

      token.save$(function (err) {
        if (err) return done(err)

        return next()
      })
    }

    function save_data_to_cache (next) {
      si.act({role: 'cache', cmd: 'set', key: id, val: JSON.stringify(saved)}, function (err) {
        if (err) return done(err)

        return next()
      })
    }
  }

  function cmd_check (args, done) {
    var token = args.token
    var useCache = args.cache || false

    if (useCache) {
      return find_cache(respond_result)
    }

    return find_entity(function () {
      find_cache(respond_result)
    })

    function respond_result (why, result) {
      if (why) {
        return done(null, {ok: false, why: why})
      }

      done(null, extend({}, {ok: true}, result))
    }

    function find_entity (next) {
      var tokenent = si.make(token_canon)
      tokenent.load$(token, function (err, respond) {
        if (err) done(err)

        if (respond) {
          var expiration = Moment(respond.expiration, Moment.ISO_8601)
          var now = Moment()
          if (expiration.isBefore(now)) {
            tokenent.remove$(token)
            return respond_result('expired')
          }
          return respond_result(null, respond)
        }

        next()
      })
    }

    function find_cache (next) {
      si.act({role: 'cache', cmd: 'get', key: token}, function (err, respond) {
        if (err) return done(err)

        if (respond) {
          return next(null, JSON.parse(respond))
        }

        next('not-found')
      })
    }
  }

  function cmd_clear (args, done) {
    var token = args.token
    var tokenent = si.make(token_canon)
    tokenent.load$(token, function (err, respond) {
      if (err) done(err)

      if (respond) {
        tokenent.remove$(token)
        return done(null, {ok: true})
      }

      si.act({role: 'cache', cmd: 'delete', key: token}, function (err, respond) {
        if (err) return done(err)

        done(null, {ok: true})
      })
    })
  }

  function cmd_extend (args, done) {
    var token = args.token
    var useCache = args.cache || false

    var expiration = Moment()
    if (args.expired_at) {
      expiration = Moment(args.expired_at, Moment.ISO_8601)
    }
    else {
      var duration = args.duration || 600
      if (duration < 10) duration = 10
      expiration.add(duration, 's')
    }

    if (useCache) {
      return extend_cache(respond_result)
    }

    return extend_entity(function () {
      extend_cache(respond_result)
    })

    function respond_result (why, result) {
      if (why) {
        return done(null, {ok: false, why: why})
      }

      done(null, extend({}, {ok: true}, result))
    }

    function extend_entity (next) {
      var tokenent = si.make(token_canon)
      tokenent.load$(token, function (err, tokenData) {
        if (err) return done(err)

        if (tokenData) {
          var now = Moment()
          if (Moment(tokenData.expiration, Moment.ISO_8601).isBefore(now)) {
            tokenent.remove$(token)
            return respond_result('expired')
          }

          tokenData.expiration = expiration.toISOString()
          tokenData.save$()
          return respond_result(null, tokenData)
        }

        next()
      })
    }

    function extend_cache (next) {
      si.act({role: 'cache', cmd: 'get', key: token}, function (err, respond) {
        if (err) return done(err)

        if (respond) {
          var data = JSON.parse(respond)

          var now = Moment()
          if (Moment(data.expiration, Moment.ISO_8601).isBefore(now)) {
            si.act({role: 'cache', cmd: 'delete', key: token})
            return respond_result('expired')
          }

          data.expiration = expiration.toISOString()
          data.cache = true
          si.act({role: 'cache', cmd: 'set', key: token, value: JSON.stringify(data)})
          return done(null, data)
        }

        next('not-found')
      })
    }
  }

  si.add({role: 'token', cmd: 'generate'}, cmd_generate)
  si.add({role: 'token', cmd: 'check'}, cmd_check)
  si.add({role: 'token', cmd: 'clear'}, cmd_clear)
  si.add({role: 'token', cmd: 'extend'}, cmd_extend)

  return 'token'
}
