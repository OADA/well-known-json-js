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

import type {} from '@fastify/accepts';
import type { FastifyReply, FastifyRequest, HTTPMethods } from 'fastify';
import fp from 'fastify-plugin';

import { Options as BaseOptions, WellKnownJSON } from './WellKnownJSON.js';

export interface Options extends BaseOptions {
  methods?: readonly HTTPMethods[];
  resources?: Record<string, Record<string, unknown>>;
  forceProtocol?: string;
  headers?: Record<string, string>;
}

export default fp<Options>(
  async (fastify, { resources = {}, ...options }) => {
    const wkj = new WellKnownJSON<FastifyRequest, FastifyReply>(
      resources,
      options
    );

    const method = Array.from(options.methods ?? WellKnownJSON.METHODS);
    fastify.route({
      url: '/.well-known/',
      method,
      handler(request, reply) {
        const accepts = request.accepts();
        if (!accepts.type(['json'])) {
          return reply.status(406).send('Not Acceptable');
        }

        if (options.headers) {
          void reply.headers(options.headers);
        }

        const base = `${
          options.forceProtocol ??
          request.headers['x-forwarded-proto'] ??
          request.protocol
        }://${request.headers['x-forwarded-host'] ?? request.headers.host}`;
        const resource = wkj.getResource(request.url, base, request, reply);
        if (resource === undefined) {
          return reply.code(404).send();
        }

        return reply.type('application/json').code(200).send(resource);
      },
    });
  },
  {
    fastify: '>=3',
    name: 'well-known-json',
    dependencies: ['@fastify/cors', '@fastify/accepts'],
    decorators: {
      request: ['accepts'],
    },
  }
);
