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

test('should serve resources provided at mount', async (t) => {
  const app = express();
  const resources = {
    foo: {
      bar: 'hello world',
      baz: 7,
    },
  };
  app.use(wkj(resources, {}));

  const response = await request(app).get('/.well-known/foo');
  t.is(response.status, 200);
});

test('should serve resources added with addResource', async (t) => {
  const app = express();
  const resource = {
    bar: 'hello world',
    baz: 7,
  };
  const middleware = wkj({});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.is(response.status, 200);
});

test('should merge resources with same URI', async (t) => {
  const app = express();
  const resources = {
    foo: {
      a: 1,
    },
  };
  const resource = {
    b: 2,
  };
  const middleware = wkj(resources, {});
  app.use(middleware);

  middleware.addResource('foo', resource);

  const response = await request(app).get('/.well-known/foo');
  t.deepEqual(response.body, { a: 1, b: 2 });
});
