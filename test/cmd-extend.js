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

  describe('cmd:extend, token: string,required$', function () {
    before(function (done) {
      si.ready(function (err) {
        if (err) return process.exit(!console.error(err))

        done()
      })
    })

    it('respond { ok: false, why: \'not-found\' } if token is not found', function (done) {
      si.act('role:token, cmd:extend, token:not-found', function (err, respond) {
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
          si.act({role: 'token', cmd: 'extend', token: respond.token}, function (err, respond) {
            expect(err).to.not.exist()
            expect(respond.ok).to.be.false()
            expect(respond.why).to.equal('expired')
            done()
          })
        }, 1100)
      })
    })

    it('respond { ok: true, data: any, expiration: { type$: string }, cache: boolean } if token is valid and have been extended successfully', function (done) {
      si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
        expect(err).to.not.exist()
        si.act({role: 'token', cmd: 'extend', token: respond.token}, function (err, respond) {
          expect(err).to.not.exist()

          var expiration = Moment(respond.expiration, Moment.ISO_8601)
          expect(Moment().add(590, 's').isBefore(expiration)).to.be.true()
          expect(Moment().add(610, 's').isAfter(expiration)).to.be.true()
          done()
        })
      })
    })

    describe('duration: { type$: number, default$: 600, min$: 10 }', function () {
      it('can extend token by duration', function (done) {
        si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
          expect(err).to.not.exist()
          si.act({role: 'token', cmd: 'extend', token: respond.token, duration: 9}, function (err, respond) {
            expect(err).to.not.exist()

            var expiration = Moment(respond.expiration, Moment.ISO_8601)
            expect(Moment().add(9, 's').isBefore(expiration)).to.be.true()
            expect(Moment().add(11, 's').isAfter(expiration)).to.be.true()
            done()
          })
        })
      })
    })

    describe('expired_at: { type$: ISO-8601-String, default$: undefined, min$: now() }', function () {
      it('can update strict expiration of token', function (done) {
        si.act({role: 'token', cmd: 'generate', data: true, duration: 10}, function (err, respond) {
          expect(err).to.not.exist()

          var expiration = Moment().add(200, 's').toISOString()
          si.act({role: 'token', cmd: 'extend', token: respond.token, expired_at: expiration}, function (err, respond) {
            expect(err).to.not.exist()

            expiration = Moment(respond.expiration, Moment.ISO_8601)
            expect(Moment().add(190, 's').isBefore(expiration)).to.be.true()
            expect(Moment().add(210, 's').isAfter(expiration)).to.be.true()
            done()
          })
        })
      })
    })

    describe('cache: { type$: boolean, default$: false }', function () {
      it('can update data in cache only', function (done) {
        si.act({role: 'token', cmd: 'generate', data: true, cache: true, duration: 10}, function (err, respond) {
          expect(err).to.not.exist()
          var token = respond.token
          si.act({role: 'token', cmd: 'extend', token: token, cache: true, duration: 100}, function (err, respond) {
            expect(err).to.not.exist()

            var expiration = Moment(respond.expiration, Moment.ISO_8601)
            expect(Moment().add(90, 's').isBefore(expiration)).to.be.true()
            expect(Moment().add(110, 's').isAfter(expiration)).to.be.true()

            var tokenent = si.make('sys', 'token')
            tokenent.load$(token, function (err, tokenData) {
              expect(err).to.not.exist()
              expect(tokenData).to.not.exist()
              done()
            })
          })
        })
      })

      it('also receivers {ok: false, why: \'expired\'} if token has expired', function (done) {
        var expiration = Moment().add(1, 's').toISOString()
        si.act({role: 'token', cmd: 'generate', data: true, cache: true, expired_at: expiration}, function (err, respond) {
          expect(err).to.not.exist()

          setTimeout(function () {
            si.act({role: 'token', cmd: 'extend', token: respond.token, cache: true}, function (err, respond) {
              expect(err).to.not.exist()
              expect(respond.ok).to.be.false()
              expect(respond.why).to.equal('expired')
              done()
            })
          }, 1100)
        })
      })
    })
  })
}
