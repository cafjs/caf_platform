// Modifications copyright 2020 Caf.js Labs and contributors
/*!
Copyright 2014 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';
/**
 * Processing pipeline for static content.
 *
 * Properties:
 *
 *      {publicPath: string, maxAgeMsec: number, strongHash: Array.<string>}
 *
 * where:
 *
 * * `publicPath`: the path, possible relative to the location of this file,
 * where the static files reside.  For example, if an app has a top level
 * `public` dir with all the static content, and includes `caf_platform` as
 * `node_modules/caf_core/node_modules/caf_platform/lib/`, the relative path is
 * `../../../../../public`.
 * * `maxAgeMsec`: `maxAge` resource setting in msec. A negative or zero value
 * means do not set.
 * * `strongHash`: list of files that require a crypto strong, content-based,
 * hash.
 *
 * @module caf_platform/pipe_static
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const assert = /** @type {typeof import('assert')} */(require('assert'));
const gen_pipe = require('./gen_pipe');
const serveStatic = require('serve-static');
const path = require('path');
const fs = require('fs');
const url = require('url');
const etagBuilder = require('etag');

exports.newInstance = async function($, spec) {
    try {
        assert.equal(typeof spec.env.publicPath, 'string',
                     "'spec.env.publicPath' is not a string");

        assert.equal(typeof spec.env.maxAgeMsec, 'number',
                     "'spec.env.maxAgeMsec' is not a number");

        assert.ok(Array.isArray(spec.env.strongHash),
                  "'spec.env.strongHash' is not an array of strings");

        const that = gen_pipe.create($, spec);

        $._.$.log && $._.$.log.debug('New static pipe');

        const computeHashes = function(pathRoot, all) {
            const result = {};
            all.forEach(function(x) {
                try {
                    // OK to block, done just once at init time.
                    const buf = fs.readFileSync(path.resolve(pathRoot, x));
                    result['/'+ x] = etagBuilder(buf);
                } catch (err) {
                    $._.$.log && $._.$.log.debug('Ignoring hash for ' + x);
                }
            });
            return result;
        };

        that.__ca_connectSetup__ = function(app) {
            const p = path.resolve(__dirname, spec.env.publicPath);
            $._.$.log && $._.$.log.debug('Using web static path ' + p +
                                         ' in ' + spec.name);
            const hashCache = computeHashes(p, spec.env.strongHash);
            $._.$.log && $._.$.log.debug('Strong hashes: ' +
                                         JSON.stringify(hashCache));

            const options = {
                index: ['index.html', 'index.htm']
            };
            if (spec.env.maxAgeMsec > 0) {
                options.maxAge = spec.env.maxAgeMsec;
            }
            const serve = serveStatic(p, options);
            serveStatic.mime.define({ 'application/wasm': ['wasm'] });
            app.use(spec.env.path, function(req, res, next) {
                const fileName = req.url && url.parse(req.url).pathname || '';
                const hash = hashCache[fileName];
                if (hash) {
                    res.setHeader('ETag', hash);
                }
                serve(req, res, next);
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
