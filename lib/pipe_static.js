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
var gen_pipe =  require('./gen_pipe');
var serveStatic = require('serve-static');

/**
 * Factory method to create a processing pipeline component for static content.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        assert.equal(typeof spec.env.publicRelativePath, 'string',
                     "'spec.env.publicRelativePath' is not a string");

        var that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New static pipe');

        /**
         * Creates a 'connect' middleware function with interface
         * `function(req, res, next)` and registers it with the application.
         *
         * @param {Object} app A 'connect' application to register a middleware
         *  function.
         *
         */
        that.__ca_connectSetup__ = function(app) {
            var serve = serveStatic(__dirname + '/' +
                                    spec.env.spec.env.publicRelativePath,
                                    {'index': ['index.html', 'index.htm']});
            app.use(spec.env.path, function(req, res, next) {
                        serve(req, res, next);
                    });
        };

        cb(null, that);
    } catch(err) {
        cb(err);
    }
};
