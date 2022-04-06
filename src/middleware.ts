/**
 * @license
 * Copyright 2014-2022 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import util from 'node:util';

import type { Request, RequestHandler, Response } from 'express';
import allow from 'allow-methods';
import cors from 'cors';

import { Options as BaseOptions, WellKnownJSON } from './WellKnownJSON.js';

export interface Options extends BaseOptions {
  methods?: readonly string[];
  forceProtocol?: string;
  headers?: Record<string, string>;
  cors?: Parameters<typeof cors>[0];
}

const WELL_KNOWN = /^\/\.well-known\/(.*)/;
const METHODS = ['OPTIONS', 'GET', 'HEAD'];

export default function wellKnownJSON(
  resources: Record<string, Record<string, unknown>>,
  options: Options = {}
) {
  const wkj = new WellKnownJSON<Request, Response>(resources, options);
  const c = options.cors ?? {};
  const corsOptions =
    typeof c === 'function'
      ? (function (request, callback) {
          c(request, (error, opt) => {
            callback(error, { methods: METHODS, ...opt });
          });
        } as cors.CorsOptionsDelegate)
      : { methods: METHODS, ...c };
  const allowMiddleware = util.promisify(allow(options.methods ?? METHODS));
  const corsMiddleware = util.promisify(cors(corsOptions));

  const middleware: RequestHandler = async (request, response, next) => {
    try {
      const m = WELL_KNOWN.exec(request.path);
      const base = `${
        options.forceProtocol ??
        request.headers['x-forwarded-proto'] ??
        request.protocol
      }://${request.headers['x-forwarded-host'] ?? request.headers.host}`;

      await allowMiddleware(request, response);

      await corsMiddleware(request, response);

      const match = m?.[1] && wkj.getResource(m[1], base, request, response);
      if (match === undefined) {
        // Pass to next middleware
        next();
        return;
      }

      if (!request.accepts('json')) {
        return response.status(406).send('Not Acceptable');
      }

      if (options.headers) {
        response.set(options.headers);
      }

      return response.json(match);
    } catch (error: unknown) {
      next(error);
      // eslint-disable-next-line no-useless-return
      return;
    }
  };

  return Object.assign(middleware, { addResource: wkj.addResource.bind(wkj) });
}
