/* Copyright 2014 Open Ag Data Alliance
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

'use strict'

var objectAssign = require('object-assign')
var URI = require('urijs')
var cors = require('cors')
var allow = require('allow-methods')

var WELL_KNOWN = /^\/\.well-known\/(.*)/
var RELATIVE = /^\.\.?\//
var METHODS = ['OPTIONS', 'GET', 'HEAD']

function makeCorsOpts (opts) {
    return objectAssign({ methods: METHODS }, opts || {})
}

function wellKnownJSON (options, resources) {
    var json = objectAssign({}, resources || {})
    options = options || {}
    var corsOptions =
        typeof options.cors === 'function'
            ? function (req, callback) {
                  options.cors(req, function (err, opts) {
                      callback(err, makeCorsOpts(opts))
                  })
              }
            : makeCorsOpts(options.cors)
    var allowMiddleware = allow(METHODS)
    var corsMiddleware = cors(corsOptions)

    var middleware = function wkjMiddleware (req, res, next) {
        var m = req.path.match(WELL_KNOWN)
        var base =
            options.baseUri ||
            (options.forceProtocol ||
                req.headers['x-forwarded-proto'] ||
                req.protocol) +
                '://' +
                (req.headers['x-forwarded-host'] || req.headers.host)

        if (!m || !m[1] || !json[m[1]]) {
            return next()
        }

        allowMiddleware(req, res, function (err) {
            if (err) {
                return next(err)
            }
            corsMiddleware(req, res, function (err) {
                if (err) {
                    return next(err)
                }

                if (!req.accepts('json')) {
                    return res.status(406).send('Not Acceptable')
                }

                if (options.headers) {
                    res.set(options.headers)
                }

                return res.json(resourceify(json[m[1]]))
            })
        })

        function resourceify (obj) {
            var out = {}

            for (var key in obj) {
                /* istanbul ignore else */
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    out[key] = resourceifyify(obj[key])
                }
            }

            return out

            function resourceifyify (val) {
                var out = val

                switch (typeof val) {
                    case 'string':
                        if (val.match(RELATIVE)) {
                            /* Resolve relative URIs */
                            out = URI(val)
                                .absoluteTo(base)
                                .toString()
                        }
                        break
                    case 'object':
                        if (
                            Object.prototype.toString.call(val) ===
                            '[object Array]'
                        ) {
                            /* Run on array values */
                            out = val.map(resourceifyify)
                        } else {
                            /* Recurse through nested objects */
                            out = resourceify(val)
                        }
                        break
                    case 'function':
                        /* Call functions */
                        out = resourceifyify(val(req, res))
                        break
                }

                return out
            }
        }
    }

    /* Add Well-Known resource, merging with any preexisting ones */
    middleware.addResource = function (uri, obj) {
        json[uri] = objectAssign(json[uri] || {}, obj)
    }

    return middleware
}

module.exports = wellKnownJSON
