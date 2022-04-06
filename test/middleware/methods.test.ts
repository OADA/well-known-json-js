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

import wkj from '../../dist/middleware.js';

const app = express();
const middleware = wkj({ foo: { a: 1, b: 2 } });
app.use(middleware);

test('should allow OPTIONS', async (t) => {
  const response = await request(app).options('/.well-known/foo');
  t.is(response.statusCode, 204);
});

for (const meth of ['get', 'head'] as const) {
  test(`should allow ${meth.toUpperCase()}`, async (t) => {
    // eslint-disable-next-line security/detect-object-injection
    const response = await request(app)[meth]('/.well-known/foo');
    t.is(response.statusCode, 200);
  });
}

for (const meth of ['put', 'post', 'patch', 'delete'] as const) {
  test(`should not allow ${meth.toUpperCase()}`, async (t) => {
    // eslint-disable-next-line security/detect-object-injection
    const response = await request(app)[meth]('/.well-known/foo');

    t.is(response.statusCode, 405);
  });
}
