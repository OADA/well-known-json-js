[![Build
Status](https://travis-ci.org/OADA/well-known-json-js.svg)](https://travis-ci.org/OADA/well-known-json-js)
[![Coverage
Status](https://coveralls.io/repos/OADA/well-known-json-js/badge.svg?branch=master)](https://coveralls.io/r/OADA/well-known-json-js?branch=master)
[![Dependency
Status](https://david-dm.org/oada/well-known-json-js.svg)](https://david-dm.org/oada/well-known-json-js)
[![License](http://img.shields.io/:license-Apache%202.0-green.svg)](http://www.apache.org/licenses/LICENSE-2.0.html)

# well-known-json

## Illustrative usage example

```typescript
import express from 'express';
import wkj from 'well-known-json';

const app = express();

// Each resource will be a separate JSON resource under the well-known endpoint
const resources = {
  'foo/bar': {
    // Will be at .well-known/foo/bar
    a: 1,
    b: 2
  },
  baz: {
    // Will be at .well-known/baz
    obj: {
      // Function properties are evaluated for each response generated
      now: function () {
        return Date.now()
      },
      // String properties that look like relative URIs are converted to absolute URIs
      uri: './relative/path'
    },
    // Other things become JSON normally
    str: 'words here'
  }
}

// Options for well-known-json middleware (and middlewares it uses)
const options = {
  // Passed directly to cors middleware
  cors: {
    /* whatever you can give the cors middleware */
  },
  // Optional base for resolving relative URIs
  // If omitted, wkj will use the protocol and host to which the request was sent
  baseUri: 'http://example.org/foo'
}

// Create a middleware instance
const wkjMiddleware = wkj(resources, options)

// Mount the middleware with express
app.use(wkjMiddleware)

// Add additional resources after creation
// They will be merged with a prexisting resource with the same name
wkjMiddleware.addResource('baz', {
  more: 'stuff', // Add key more to baz
  str: 'different words here' // Overwrite key str in baz from before
})
```

## Features

- Enables CORS (including pre-flight) for its corresponding JSON documents
- Converts relative URIs to absolute
- Can have functions "in the documents" which get evaluated for each request
- Supports de-facto standard for reverse proxies (i.e. X-Forwarded-\* headers)
