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

import express from 'express';
import request from 'supertest';

import { wellKnownJSON as wkj } from '../../dist/middleware.js';

test('should resolve relative URIs to absolute', async (t) => {
  const app = express();
  const resource = {
    uri: './thing',
  };
  const middleware = wkj({}, { baseUri: 'http://example.com' });
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.is(response.body.uri, 'http://example.com/thing');
});

test('should work with array properties', async (t) => {
  const app = express();
  const resource = {
    arr: [1, 2, 3],
  };
  const middleware = wkj({});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.assert(Array.isArray(response.body.arr));
});

test('should evaluate function properties', async (t) => {
  const app = express();
  const resource = {
    fun() {
      return 'FUN_RETURN';
    },
  };
  const middleware = wkj({});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.is(response.body.fun, 'FUN_RETURN');
});

test('should handle nested object properties', async (t) => {
  const app = express();
  const resource = {
    obj: {
      obj: {
        uri: './thing',
        arr: [1, 2, 3],
        fun() {
          return 'FUN_RETURN';
        },
      },
    },
  };
  const middleware = wkj({}, { baseUri: 'http://example.com' });
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.is(response.body.obj.obj.uri, 'http://example.com/thing');
  t.assert(Array.isArray(response.body.obj.obj.arr));
  t.is(response.body.obj.obj.fun, 'FUN_RETURN');
});
