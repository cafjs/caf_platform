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
 * Processing pipeline for security checks.
 *
 *
 * @name pipe_security
 * @namespace
 * @augments caf_components/gen_pipe
 */
var assert = require('assert');
var gen_pipe =  require('./gen_pipe');
var json_rpc = require('caf_transport').json_rpc;

/**
 * Factory method to create a processing pipeline component for security checks.
 *
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New security pipe');


        /**
         * Creates a 'connect' middleware function with interface
         * `function(req, res, next)` and registers it with the application.
         *
         * @param {Object} app A 'connect' application to register a
         * middleware function.
         *
         */
        that.__ca_connectSetup__ = function(app) {
            if ($._.$.security) {
                app.use(spec.env.path, function(req, res, next) {
                            var msg = req.body;
                            var sendError = function(err) {
                                var code = json_rpc.ERROR_CODES.notAuthorized;
                                var error = json_rpc
                                    .newSysError(msg, code, 'Not Authorized',
                                                 err);
                                that.__ca_send__(res, json_rpc.reply(error));
                            };
                            var from = json_rpc.getFrom(msg);
                            var token = json_rpc.getToken(msg);
                            $._.$.security
                                .__ca_authenticate__(from , token,
                                                     function(err) {
                                                         if (err) {
                                                             sendError(err);
                                                         } else {
                                                             next();
                                                         }
                                                     });
                        });
            } else {
                $._.$.log &&
                    $._.$.log.warn('Warning: Security checks DISABLED!');
                app.use(spec.env.path, function(req, res, next) { next();});
            };
        };

        cb(null, that);
    } catch(err) {
        cb(err);
    }
};
