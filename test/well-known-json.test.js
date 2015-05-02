/*
 * Copyright 2014 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var expect = require('chai').expect;
var express = require('express');
var request = require('supertest');

var wkj = require('../');

describe('wkj', function() {
    var app;

    beforeEach(function() {
        app = express();
    });

    it('should export a function which returns a middleware', function() {
        expect(wkj).to.be.a('function');
        var middleware = wkj();
        expect(middleware).to.be.a('function');
        expect(middleware).to.have.length(3);
    });

    it('should pass errors up', function(done) {
        var options = {};
        options.cors = function failingOptionsCallback(req, cb) {
            cb(new Error('Options Failure'));
        };

        app.use(wkj(options, {foo: {}}));

        app.use(function(err, req, res, next) {
            expect(err).to.be.ok;
            expect(err.message).to.equal('Options Failure');

            next();
        });

        request(app)
            .get('/.well-known/foo')
            .expect(404, done);
    });

    it('should pass unknown requests to next middleware', function(done) {
        app.use(wkj());

        app.use(function(req, res) {
            res.status(200).end();
        });

        request(app)
            .get('/.well-known/foo')
            .expect(200, done);
    });

    it('should return JSON', function(done) {
        var resource = {
            bar: 'hello world',
            baz: 7
        };
        var middleware = wkj();
        app.use(middleware);

        middleware.addResource('foo', resource);

        request(app)
            .get('/.well-known/foo')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });

    describe('JSON conversion', function() {
        it('should resolve relative URIs to absolute', function(done) {
            var resource = {
                uri: './thing'
            };
            var middleware = wkj({baseUri: 'http://example.com'});
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    return res.body.uri !== 'http://example.com/thing';
                })
                .end(done);
        });

        it('should work with array properties', function(done) {
            var resource = {
                arr: [1, 2, 3]
            };
            var middleware = wkj();
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    return Object.prototype.toString.call(res.body.arr) !==
                        '[object Array]';
                })
                .end(done);
        });

        it('should evaluate function properties', function(done) {
            var resource = {
                fun: function() {
                    return 'FUN_RETURN';
                }
            };
            var middleware = wkj();
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    return res.body.fun !== 'FUN_RETURN';
                })
                .end(done);
        });

        it('should handle nested object properties', function(done) {
            var resource = {
                obj: {
                    obj: {
                        uri: './thing',
                        arr: [1, 2, 3],
                        fun: function() {
                            return 'FUN_RETURN';
                        }
                    }
                }
            };
            var middleware = wkj({baseUri: 'http://example.com'});
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    return !(
                        res.body.obj.obj.uri === 'http://example.com/thing' &&
                        Object.prototype.toString.call(res.body.obj.obj.arr) ===
                            '[object Array]' &&
                        res.body.obj.obj.fun === 'FUN_RETURN');
                })
                .end(done);
        });
    });

    describe('resource handling', function() {
        it('should serve resources provided at mount', function(done) {
            var resources = {
                foo: {
                    bar: 'hello world',
                    baz: 7
                }
            };
            app.use(wkj({}, resources));

            request(app)
                .get('/.well-known/foo')
                .expect(200, done);
        });

        it('should serve resources added with addResource', function(done) {
            var resource = {
                bar: 'hello world',
                baz: 7
            };
            var middleware = wkj();
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(200, done);
        });

        it('should merge resources with same URI', function(done) {
            var resources = {
                foo: {
                    a: 1
                }
            };
            var resource = {
                b: 2
            };
            var middleware = wkj({}, resources);
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    return !(res.body.a === 1 && res.body.b === 2);
                })
                .end(done);
        });
    });

    it('should return Not Acceptable for non-JSON Accept', function(done) {
        var resource = {
            bar: 'hello world',
            baz: 7
        };
        var middleware = wkj();
        app.use(middleware);

        middleware.addResource('foo', resource);

        request(app)
            .get('/.well-known/foo')
            .set('Accept', 'application/xml')
            .expect(406, done);
    });

    describe('reverse proxy support', function() {
        it('should respect X-Forwarded-Proto', function(done) {
            var resource = {
                uri: './thing'
            };
            var middleware = wkj({});
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .set('X-Forwarded-Proto', 'test')
                .expect(function(res) {
                    return res.body.uri !== 'test://' + res.req._headers.host +
                        '/thing';
                })
                .end(done);
        });

        it('should respect X-Forwarded-Host', function(done) {
            var resource = {
                uri: './thing'
            };
            var middleware = wkj({});
            app.use(middleware);

            middleware.addResource('foo', resource);

            request(app)
                .get('/.well-known/foo')
                .set('X-Forwarded-Host', 'test.test:7')
                .expect(function(res) {
                    return res.body.uri !== 'http://test.test:7/thing';
                })
                .end(done);
        });
    });

    describe('HTTP method support', function() {
        beforeEach(function() {
            var middleware = wkj({}, {foo: {a:1, b:2}});
            app.use(middleware);
        });

        it('should allow OPTIONS', function(done) {
            request(app).options('/.well-known/foo').expect(204, done);
        });

        ['get', 'head'].forEach(function(meth) {
            it('should allow ' + meth.toUpperCase(), function(done) {
                request(app)[meth]('/.well-known/foo').expect(200, done);
            });
        });

        ['put', 'post', 'patch', 'delete'].forEach(function(meth) {
            it('should not allow ' + meth.toUpperCase(), function(done) {
                /* jshint unused: vars */
                app.use(function(err, req, res, next) {
                    expect(err.status).to.equal(405);
                    done();
                });
                /* jshint unused: true */

                request(app)[meth]('/.well-known/foo').end();
            });
        });
    });

    describe('HTTP headers support', function() {
        it('should response with the given headers', function(done) {
            var options = {
                headers: {
                    'Content-Type': 'application/test+json'
                }
            };
            var middleware = wkj(options, {foo: 'bar'});
            app.use(middleware);

            request(app)
                .get('/.well-known/foo')
                .expect(function(res) {
                    expect(res.headers['content-type']).to
                        .contain('application/test+json');
                })
                .end(done);
        });
    });
});
