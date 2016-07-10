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
"use strict";
/**
 * Processing pipeline for static content.
 *
 *
 * @name pipe_static
 * @namespace
 * @augments caf_components/gen_pipe
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var gen_pipe =  require('./gen_pipe');
var serveStatic = require('serve-static');
var path = require('path');
var fs = require('fs');
var url = require('url');
var etagBuilder = require('etag');

/**
 * Factory method to create a processing pipeline component for static content.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        assert.equal(typeof spec.env.publicPath, 'string',
                     "'spec.env.publicPath' is not a string");

        assert.equal(typeof spec.env.maxAgeMsec, 'number',
                     "'spec.env.maxAgeMsec' is not a number");

        assert.ok(Array.isArray(spec.env.strongHash),
                  "'spec.env.strongHash' is not an array of strings");

        var that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New static pipe');

        var computeHashes = function(pathRoot, all) {
            var result = {};
            all.forEach(function(x) {
                try {
                    // OK to block, done just once at init time.
                    var buf = fs.readFileSync(path.resolve(pathRoot, x));
                    result['/'+ x] = etagBuilder(buf);
                } catch(err) {
                    $._.$.log && $._.$.log.debug('Ignoring hash for ' + x);
                }
            });
            return result;
        };

        /**
         * Creates a 'connect' middleware function with interface
         * `function(req, res, next)` and registers it with the application.
         *
         * @param {Object} app A 'connect' application to register a middleware
         *  function.
         *
         */
        that.__ca_connectSetup__ = function(app) {
            var p = path.resolve(__dirname, spec.env.publicPath);
            $._.$.log && $._.$.log.debug('Using web static path ' + p +
                                         ' in ' + spec.name);
            var hashCache = computeHashes(p, spec.env.strongHash);
            $._.$.log && $._.$.log.debug('Strong hashes: ' +
                                         JSON.stringify(hashCache));

            var options = {
                index: ['index.html', 'index.htm']
            };
            if (spec.env.maxAgeMsec > 0) {
                options.maxAge = spec.env.maxAgeMsec;
            }
            var serve = serveStatic(p, options);

            app.use(spec.env.path, function(req, res, next) {
                var fileName = req.url && url.parse(req.url).pathname || '';
                var hash = hashCache[fileName];
                if(hash) {
                    res.setHeader('ETag', hash);
                }
                serve(req, res, next);
            });
        };

        cb(null, that);

    } catch(err) {
        cb(err);
    }
};
