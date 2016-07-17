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
    .use(require('seneca-cache'))
    .use('../token')

  describe('cmd:generate', function () {
    before(function (done) {
      si.ready(function (err) {
        if (err) return process.exit(!console.error(err))

        done()
      })
    })

    it('responds {ok: true, token: { type$: string } [, expiration: { type$: string }, cache: boolean] }', function (done) {
      si.act('role: token, cmd: generate', function (err, respond) {
        expect(err).to.not.exist()
        expect(respond.ok).to.be.true()
        expect(respond.token).to.be.a.string()
        done(err)
      })
    })

    describe('length: { type$: number, default$: 40, gte$: 10, lte$: 256 }', function () {
      it('has default value is 40', function (done) {
        si.act('role:token, cmd:generate', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          expect(respond.token).to.have.length(40)
          done()
        })
      })

      it('has minimum value is 10', function (done) {
        si.act('role:token, cmd:generate, length: 9', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          expect(respond.token).to.have.length(10)
          done()
        })
      })

      it('has maximum value is 256', function (done) {
        si.act('role:token, cmd:generate, length: 257', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          expect(respond.token).to.have.length(256)
          done()
        })
      })

      it('returns a base62 string', function (done) {
        si.act('role:token, cmd:generate', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          expect(respond.token).to.not.contain('$')
          expect(respond.token).to.not.contain('-')
          expect(respond.token).to.not.contain('=')
          expect(respond.token).to.not.contain('&')
          done()
        })
      })
    })

    describe('chars: { type$: string, default$: \'default\'}', function () {
      it('can generate token with lowercase characters [a-z]', function (done) {
        si.act('role:token, cmd:generate, chars: a-z', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          var exceptChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789=&!'
          for (var i = 0, l = exceptChars.length; i < l; i++) {
            expect(respond.token).to.not.contain(exceptChars.charAt(i))
          }
          done()
        })
      })

      it('can generate token with uppercase characters [A-Z]', function (done) {
        si.act('role:token, cmd:generate, chars: A-Z', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          var exceptChars = 'abcdefghijklmnopqrstuvwxyz0123456789=&!'
          for (var i = 0, l = exceptChars.length; i < l; i++) {
            expect(respond.token).to.not.contain(exceptChars.charAt(i))
          }
          done()
        })
      })

      it('can generate token with number only [0-9]', function (done) {
        si.act('role:token, cmd:generate, chars: 0-9', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          var exceptChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=&!'
          for (var i = 0, l = exceptChars.length; i < l; i++) {
            expect(respond.token).to.not.contain(exceptChars.charAt(i))
          }
          done()
        })
      })

      it('can generate token with special characters', function (done) {
        si.act('role:token, cmd:generate, chars: $#@!%^', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.ok).to.be.true()
          var exceptChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
          for (var i = 0, l = exceptChars.length; i < l; i++) {
            expect(respond.token).to.not.contain(exceptChars.charAt(i))
          }
          done()
        })
      })
    })

    describe('data: { type$: any, default$: undefined }', function () {
      it('has default value is undefined, that means just generate token, do not store', function (done) {
        si.act({role: 'token', cmd: 'generate'}, function (err, respond) {
          expect(err).to.not.exist()

          var tokenent = si.make('sys', 'token')
          tokenent.load$(respond.token, function (err, tokenData) {
            expect(err).to.not.exist()
            expect(tokenData).to.be.null()
            done()
          })
        })
      })

      it('can generate token and hold data in entity -/sys/token or caching', function (done) {
        var data = 'anything except function :)'

        si.act({role: 'token', cmd: 'generate', data: data}, function (err, respond) {
          expect(err).to.not.exist()

          var tokenent = si.make('sys', 'token')
          tokenent.load$(respond.token, function (err, tokenData) {
            expect(err).to.not.exist()
            expect(tokenData.data).to.equal(data)
            done()
          })
        })
      })
    })

    describe('cache: { type$: boolean, default$: false }', function () {
      it('depends on data argument, skipped if data is not found', function (done) {
        si.act('role:token, cmd:generate', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.not.exist()
          done()
        })
      })

      it('uses seneca-cache when iff it has value true', function (done) {
        var data = 'anything except function :)'
        si.act({role: 'token', cmd: 'generate', data: data, cache: true}, function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.cache).to.be.true()

          var tokenent = si.make('sys', 'token')
          tokenent.load$(respond.token, function (err, tokenData) {
            expect(err).to.not.exist()
            expect(tokenData).to.be.null()

            si.act({role: 'cache', cmd: 'get', key: respond.token}, function (err, cacheResult) {
              expect(err).to.not.exist()
              var cacheData = JSON.parse(cacheResult)
              expect(cacheData.data).to.equal(data)

              done()
            })
          })
        })
      })

      it('stores in entity -/sys/token iff cache has value false', function (done) {
        var data = 'anything except function :)'
        si.act({role: 'token', cmd: 'generate', data: data, cache: false}, function (err, respond) {
          expect(err).to.not.exist()

          var tokenent = si.make('sys', 'token')
          tokenent.load$(respond.token, function (err, tokenData) {
            expect(err).to.not.exist()
            expect(tokenData.data).to.equal(data)
            done()
          })
        })
      })
    })

    describe('duration: { type$: number, default$: 600, min$: 10 }', function () {
      it('depends on data argument, skipped if data is not found', function (done) {
        si.act('role:token, cmd:generate', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.not.exist()
          done()
        })
      })

      it('can set duration of token', function (done) {
        var data = 'anything except function :)'
        si.act({role: 'token', cmd: 'generate', data: data, duration: 300}, function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.exist()

          var expiration = Moment(respond.expiration, Moment.ISO_8601)
          expect(Moment().add(290, 's').isBefore(expiration)).to.be.true()
          expect(Moment().add(310, 's').isAfter(expiration)).to.be.true()

          done()
        })
      })

      it('has minimum valis is 10', function (done) {
        var data = 'anything except function :)'
        si.act({role: 'token', cmd: 'generate', data: data, duration: 9}, function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.exist()

          var expiration = Moment(respond.expiration, Moment.ISO_8601)
          expect(Moment().add(8, 's').isBefore(expiration)).to.be.true()
          expect(Moment().add(12, 's').isAfter(expiration)).to.be.true()

          done()
        })
      })
    })

    describe('expired_at: { type$: ISO-8601-String, default$: undefined, min$: now() }', function () {
      it('depends on data argument, skipped if data is not found', function (done) {
        si.act('role:token, cmd:generate', function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.not.exist()
          done()
        })
      })

      it('can set strict expiration of token', function (done) {
        var data = 'anything except function :)'
        var expired_at = Moment().add(300, 's').toISOString()

        si.act({role: 'token', cmd: 'generate', data: data, expired_at: expired_at}, function (err, respond) {
          expect(err).to.not.exist()
          expect(respond.expiration).to.equal(expired_at)

          done()
        })
      })
    })
  })
}
