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

import URI from 'urijs';

const RELATIVE = /^\.\.?\//;

export type Options = {
  baseUri?: string;
};

export class WellKnownJSON<In = unknown, Out = unknown> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly METHODS = ['OPTIONS', 'GET', 'HEAD'] as const;

  #base;
  #json;

  constructor(
    resources: Record<string, Record<string, unknown>>,
    options: Options = {}
  ) {
    this.#base = options.baseUri;
    this.#json = new Map(Object.entries(resources));
  }

  /**
   * Get a particular well-known resource
   *
   * @param name
   * @param base
   * @returns
   */
  getResource(name: string, baseIn?: string, ...rest: [In, Out]) {
    const base = this.#base ?? baseIn;
    const match = this.#json.get(name);

    return resourceify(match);
    function resourceify(value: unknown): unknown {
      if (!value) {
        return value;
      }

      switch (typeof value) {
        case 'string':
          return RELATIVE.test(value)
            ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
              new URI(value, base).toString()
            : value;

        case 'object':
          return Array.isArray(value)
            ? value.map((element) => resourceify(element))
            : Object.fromEntries(
                Object.entries(value!).map(([k, v]) => [k, resourceify(v)])
              );

        case 'function':
          /* Call functions */
          return resourceify(value(...rest));

        default:
          return value;
      }
    }
  }

  /**
   * Add Well-Known resource, merging with any preexisting ones
   */
  addResource(uri: string, object: Record<string, unknown>) {
    this.#json.set(uri, { ...this.#json.get(uri), ...object });
  }
}
