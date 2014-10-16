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

    it('should be exported', function() {
        expect(wkj).to.be.a('function');
    });

    it('should pass errors up', function(done) {
        var options = {};
        options.cors = function failingOptionsCallback(req, cb) {
            cb(new Error('Options Failure'));
        };

        var app = express();
        app.use(wkj(options));

        app.use(function(err, req, res, next) {
            expect(err).to.be.ok;
            expect(err.message).to.equal('Options Failure');

            next();
        });

        request(app)
            .get('/.well-known/foo')
            .expect(404, done);
    });

    it('should serve resources provided at mount', function(done) {
        var resources = {
            foo: {
                bar: 'hello world',
                baz: 7
            }
        };
        var app = express();
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
        var app = express();
        var middleware = wkj({});
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
        var app = express();
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

    it('should return JSON', function(done) {
        var resource = {
            bar: 'hello world',
            baz: 7
        };
        var app = express();
        var middleware = wkj({});
        app.use(middleware);

        middleware.addResource('foo', resource);

        request(app)
            .get('/.well-known/foo')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });
});
