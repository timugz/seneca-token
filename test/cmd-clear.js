/* Copyright (c) 2016 timugz (timugz@gmail.com) */
'use strict'

module.exports = function (lab) {
  var Seneca = require('seneca')
  var Code = require('code')

  var describe = lab.describe
  var it = lab.it
  var before = lab.before

  var expect = Code.expect
  var si = Seneca({log: 'silent', strict: {result: false}})
  if (si.version >= '2.0.0') {
    si.use(require('seneca-entity'))
  }
  si
    .use('cache')
    .use('../token')

  describe('cmd:clear, token: string,required$', function () {
    before(function (done) {
      si.ready(function (err) {
        if (err) return process.exit(!console.error(err))

        done()
      })
    })

    it('responds { ok: true} in anyways, do not depend on token is existing or not', function (done) {
      si.act('role:token, cmd:generate, data: true, duration: 10', function (err, respond) {
        expect(err).to.not.exist()
        var token = respond.token
        si.act({role: 'token', cmd: 'clear', token: token}, function (err, respond) {
          expect(err).to.not.exist()

          var tokenent = si.make('sys', 'token')
          tokenent.load$(token, function (err, tokenData) {
            expect(err).to.not.exist()
            expect(tokenData).to.not.exist()
            done()
          })
        })
      })
    })

    it('can remove token in cache and in entity', function (done) {
      si.act('role:token, cmd:generate, data: true, cache: true, duration: 10', function (err, respond) {
        expect(err).to.not.exist()
        var token = respond.token
        si.act({role: 'token', cmd: 'clear', token: token}, function (err, respond) {
          expect(err).to.not.exist()

          si.act({role: 'cache', cmd: 'get', token: token}, function (err, respond) {
            expect(err).to.not.exist()
            expect(respond).to.not.exist()
            done()
          })
        })
      })
    })
  })
}
