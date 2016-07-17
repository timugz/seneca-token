/* Copyright (c) 2016 timugz (timugz@gmail.com) */
'use strict'

module.exports = function (lab) {
  var Moment = require('moment')
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

  describe('cmd:check, token: string,required$', function () {
    before(function (done) {
      si.ready(function (err) {
        if (err) return process.exit(!console.error(err))

        done()
      })
    })

    it('respond { ok: false, why: \'not-found\' } if token is not found', function (done) {
      si.act('role:token, cmd:check, token:not-found', function (err, respond) {
        expect(err).to.not.exist()
        expect(respond.ok).to.be.false()
        expect(respond.why).to.equal('not-found')
        done()
      })
    })

    it('respond { ok: false, why: \'expired\' } if token had expired', function (done) {
      var expiration = Moment().add(1, 's').toISOString()
      si.act({role: 'token', cmd: 'generate', data: true, expired_at: expiration}, function (err, respond) {
        expect(err).to.not.exist()

        setTimeout(function () {
          si.act({role: 'token', cmd: 'check', token: respond.token}, function (err, respond) {
            expect(err).to.not.exist()
            expect(respond.ok).to.be.false()
            expect(respond.why).to.equal('expired')
            done()
          })
        }, 1100)
      })
    })

    it('respond { ok: true, data: any } if valid token and has data', function (done) {
      si.act('role:token, cmd:generate, data: true, duration: 10', function (err, respond) {
        expect(err).to.not.exist()
        si.act({role: 'token', cmd: 'check', token: respond.token}, function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.data).to.be.true()
          done()
        })
      })
    })

    describe('cache: {type$: boolean, default$: false}', function () {
      it('can check data in cache only', function (done) {
        si.act('role:token, cmd:generate, data: true, cache: true', function (err, respond) {
          expect(err).to.not.exist()
          si.act({role: 'token', cmd: 'check', token: respond.token, cache: true}, function (err, respond) {
            expect(err).to.not.exist()
            expect(respond.data).to.be.true()
            done()
          })
        })
      })
    })

    describe('Internal logic: ', function () {
      it('token will be deleted in entity -/sys/token if it has expired', function (done) {
        var expiration = Moment().add(1, 's').toISOString()
        si.act({role: 'token', cmd: 'generate', data: true, expired_at: expiration}, function (err, respond) {
          expect(err).to.not.exist()

          var token = respond.token
          setTimeout(function () {
            si.act({role: 'token', cmd: 'check', token: token}, function (err, respond) {
              expect(err).to.not.exist()
              expect(respond.ok).to.be.false()
              expect(respond.why).to.equal('expired')

              var tokenent = si.make('sys', 'token')
              tokenent.load$(token, function (err, tokenData) {
                expect(err).to.not.exist()
                expect(tokenData).to.not.exist()
                done()
              })
            })
          }, 1100)
        })
      })
    })
  })
}
