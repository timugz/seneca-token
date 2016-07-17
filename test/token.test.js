/* Copyright (c) 2016 timugz (timugz@gmail.com) */
'use strict'

var Code = require('code')
var Lab = require('lab')
var Seneca = require('seneca')
var SenecaToken = require('..')

// Shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('seneca-token', function () {
  describe('dependencies', function () {
    it('depends on seneca-entity', function (done) {
      done()
    })

    it('depends on one of caching plugin: seneca-cache | seneca-memcached | seneca-redis-cache', function (done) {
      done()
    })
  })

  describe('role:token', function () {
    require('./cmd-generate')(lab)
    require('./cmd-check')(lab)
    require('./cmd-extend')(lab)
    require('./cmd-clear')(lab)
  })

  it('can be used by seneca', function (done) {
    var seneca = Seneca({log: 'silent'})

    var fn = function () {
      seneca.use(SenecaToken)
    }

    expect(fn).to.not.throw()
    done()
  })

  it('can be used in back-layer (via transport)', function (done) {
    var server = Seneca({log: 'silent'})
    if (server.version >= '2.0.0') {
      server.use(require('seneca-entity'))
    }
    server
      .use('cache')
      .use('../token')
      .listen()
      .ready(function () {
        var si = Seneca({log: 'silent'})
        si.client()

        si.ready(function () {
          si.act('role: token, cmd: generate', function (err, respond) {
            expect(err).to.not.exist()
            expect(respond.token).to.be.string()

            si.close()
            server.close()
            done()
          })
        })
      })
  })
})
