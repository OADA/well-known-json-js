/**
 * @license
 * Copyright 2014-2022 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http: *www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by servicelicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import express from 'express';
import { middleware as wkj } from '../dist';

const app = express();
app.set('json spaces', 2);

const middleware = wkj({ foo: { test: 'a/b/c', foo: './bar' } }, {});

app.use(middleware);

middleware.addResource('hello', {
  world: 'stuff',
  obj: {
    a: 1,
    b: 2,
  },
  arr: [1, 2, 3],
  n: (function () {
    let n = 0;
    return function () {
      return n++;
    };
  })(),
});

app.listen();
