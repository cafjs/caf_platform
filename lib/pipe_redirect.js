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
 * Processing pipeline for redirecting a CA messages to a different node.
 *
 *
 * @name pipe_redirect
 * @namespace
 * @augments caf_components/gen_pipe
 */
var assert = require('assert');
var gen_pipe = require('./gen_pipe');
var json_rpc = require('caf_transport').json_rpc;

var REDIRECT_PREFIX = 'host';

/**
 * Factory method to create a processing pipeline component to redirect
 *  a CA message to other node.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_pipe.constructor($, spec);

        assert.equal(typeof spec.env.usePortRedirection, 'boolean',
                     "'spec.env.usePortRedirection' not a boolean");
        $._.$.log && $._.$.log.debug('New redirect pipe');

        /**
         * Creates a 'connect' middleware function with interface
         * `function(req, res, next)` and registers it with the application.
         *
         * @param {Object} app A 'connect' application to register a middleware
         *  function.
         *
         */
        that.__ca_connectSetup__ = function(app) {
            var toURL = function(remoteNode) {
                var p = remoteNode.split(':');
                return REDIRECT_PREFIX + p[1] + '-' + p[0];
            };
            app.use(spec.env.path, function(req, res, next) {
                if (req.error && req.error.remoteNode) {
                    var remoteNode = (spec.env.usePortRedirection ?
                                              req.error.remoteNode :
                                              toURL(req.error.remoteNode));
                    req.error.remoteNode = remoteNode;
                    var resp = json_rpc
                                .redirect(req.body, 'Redirecting to ' +
                                          remoteNode, req.error);
                    that.__ca_send__(res, resp);
                } else {
                    next();
                }
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
