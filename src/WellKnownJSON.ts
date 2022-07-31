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

export interface Options {
  baseUri?: string;
}

type Collection<T> = Record<string, T> | Iterable<[string, T]>;
type Resources = Collection<Collection<unknown>>;

function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof value === 'object' && Symbol.iterator in (value ?? {});
}

interface Entries<K, V> {
  entries(): Iterable<[K, V]>;
}
function hasEntries<K, V>(value: unknown): value is Entries<K, V> {
  return (
    typeof value === 'object' &&
    // @ts-expect-error stuff
    typeof value?.entries === 'function'
  );
}

function normalize<T>(
  collection: Collection<Collection<T>>
): Map<string, Map<string, T>> {
  const entries = isIterable(collection)
    ? collection
    : Object.entries(collection);
  return new Map(
    Array.from(entries, ([k, v]) => [
      k,
      new Map(isIterable(v) ? v : Object.entries(v)),
    ])
  );
}

export class WellKnownJSON<In = unknown, Out = unknown> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly METHODS = ['OPTIONS', 'GET', 'HEAD'] as const;

  #base;
  #json;

  constructor(resources: Resources, options: Options = {}) {
    this.#base = options.baseUri;
    this.#json = normalize(resources);
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

        case 'object': {
          if (!value) {
            return value;
          }

          if (Array.isArray(value)) {
            return value.map((element) => resourceify(element));
          }

          const entries = hasEntries(value)
            ? value.entries()
            : Object.entries(value);
          return Object.fromEntries(
            Array.from(entries, ([k, v]) => [k, resourceify(v)])
          );
        }

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
  addResource(uri: string, collection: Collection<unknown>) {
    const entries = isIterable(collection)
      ? collection
      : Object.entries(collection);
    this.#json.set(uri, new Map([...(this.#json.get(uri) ?? []), ...entries]));
  }
}
