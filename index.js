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

'use strict';

var objectAssign = require('object-assign');
var URI = require('URIjs');
var cors = require('cors');

var WELL_KNOWN = /^\/\.well-known\/(.*)/;
var RELATIVE = /^\.\.?\//;

function wellKnownJSON(options, resources) {
    var json = objectAssign({}, resources || {});
    var corsMiddleware = cors(options && options.cors || {});

    var middleware = function(req, res, next) {
        var m = req.path.match(WELL_KNOWN);
        var base = options.baseUri || req.protocol + '://' + req.headers.host;

        if (!m || !m[1] || !json[m[1]]) {
            return next();
        }

        corsMiddleware(req, res, function(err) {
            if (err) { return next(err); }

            if (!req.accepts('json')) {
                return res.status(406).send('Not Acceptable');
            }

            return res.json(resourceify(json[m[1]]));
        });

        function resourceify(obj) {
            var out = {};

            for (var key in obj) {
                out[key] = resourceifyify(obj[key]);
            }

            return out;

            function resourceifyify(val) {
                var out = val;

                switch (typeof val) {
                case 'string':
                    if (val.match(RELATIVE)) {
                        /* Resolve relative URIs */
                        out = URI(val).absoluteTo(base).toString();
                    }
                    break;
                case 'object':
                    if (Object.prototype.toString.call(val) ===
                            '[object Array]') {
                        /* Run on array values */
                        out = val.map(resourceifyify);
                    } else {
                        /* Recurse through nested objects */
                        out = resourceify(val);
                    }
                    break;
                case 'function':
                    /* Call functions */
                    out = resourceifyify(val());
                    break;
                }

                return out;
            }
        }
    };

    /* Add Well-Known resource, merging with any preexisting ones */
    middleware.addResource = function(uri, obj) {
        json[uri] = objectAssign(json[uri] || {}, obj);
    };

    return middleware;
}

module.exports = wellKnownJSON;
