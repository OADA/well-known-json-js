/**
 * @license
 * Copyright 2014-2022 Open Ag Data Alliance
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

import test from 'ava';

import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';

import wkj, { type Options } from '../../dist/middleware.js';

test('should export a function which returns a middleware', (t) => {
  t.assert(typeof wkj === 'function');
  const middleware = wkj({});
  t.assert(typeof middleware === 'function');
  t.is(middleware.length, 3);
});

test('should pass errors up', async (t) => {
  const app = express();
  const options: Options = {};
  options.cors = (_, callback) => {
    callback(new Error('Options Failure'));
  };

  app.use(wkj({ foo: {} }, options));

  app.use(((error: unknown, _request, response, _next) => {
    t.like(error, { message: 'Options Failure' });
    response.status(500).send(error);
  }) as ErrorRequestHandler);

  // eslint-disable-next-line sonarjs/no-duplicate-string
  const response = await request(app).get('/.well-known/foo');
  t.is(response.statusCode, 500);
});

test('should pass unknown requests to next middleware', async (t) => {
  const app = express();
  app.use(wkj({}));

  app.use(async (_, response) => {
    response.status(200).end();
  });

  const response = await request(app).get('/.well-known/foo');
  t.is(response.statusCode, 200);
});

test('should return JSON', async (t) => {
  const app = express();
  const resource = {
    bar: 'hello world',
    baz: 7,
  };
  const middleware = wkj({});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.is(response.statusCode, 200);
  t.regex(response.headers['content-type'], /json/);
});

test('should return Not Acceptable for non-JSON Accept', async (t) => {
  const app = express();
  const resource = {
    bar: 'hello world',
    baz: 7,
  };
  const middleware = wkj({});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app)
    .get('/.well-known/foo')
    .set('Accept', 'application/xml');
  t.is(response.statusCode, 406);
});

test('should respond with the given headers', async (t) => {
  const app = express();
  const options = {
    headers: {
      'Content-Type': 'application/test+json',
    },
  };
  const middleware = wkj({ foo: { bar: 'baz' } }, options);
  app.use(middleware);

  const response = await request(app).get('/.well-known/foo');
  t.regex(response.headers['content-type'], /^application\/test\+json/);
});
