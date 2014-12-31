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
 * Processing pipeline for dispatching messages to CAs.
 *
 *
 * @name pipe_dispatcher
 * @namespace
 * @augments caf_components/gen_pipe
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var gen_pipe =  require('./gen_pipe');
var json_rpc = require('caf_transport');

/**
 * Factory method to create a processing pipeline component to dispatch
 *  messages to CAs.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New dispatcher pipe');

        var isBackchannel = function(msg) {
            return (msg.method === 'backchannel');
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
            app.use(spec.env.path, function(req, res, next) {
                        var msg = req.body;
                        var caId = json_rpc.getTo(msg);
                        var blockCreate = req.blockCreate;
                        var processResponseF = function(err, resp) {
                            var sendError = function(error) {
                                that.__ca_send__(res, json_rpc.reply(error));
                            };
                            if (err) {
                                if (err.noSuchCA) {
                                    var code = json_rpc.ERROR_CODES.noSuchCA;
                                    var error = json_rpc
                                        .newSysError(msg, code, 'No such CA',
                                                     err);
                                    sendError(error);
                                } else if (err.remoteNode) {
                                    // force a redirect with the next pipe
                                    req.error = err;
                                    next();
                                } else {
                                    var code = json_rpc.ERROR_CODES
                                        .internalError;
                                    var error = json_rpc
                                        .newSysError(msg, code,
                                                     'Internal Error', err);
                                    sendError(error);
                                }
                            } else {
                                that.__ca_send__(res, resp);
                            }
                        };
                        async.waterfall(
                            [
                                function(cb0) {
                                    try {
                                        var target = $._.$.registry.$[caId];
                                        if (target) {
                                            cb0(null, target);
                                        } else {
                                            if (blockCreate) {
                                                var str = 'Cannot create CA';
                                                var err = new Error(str);
                                                err.noSuchCA = true;
                                                cb0(err);
                                            } else {
                                                var spec = {name: caId};
                                                $._.$.registry
                                                    .__ca_instanceChild__(null,
                                                                          spec,
                                                                          cb0);
                                            }
                                        }
                                    } catch (ex) {
                                        cb0(ex);
                                    }
                                },
                                function(ca, cb0) {
                                    if (isBackchannel(msg)) {
                                        ca.__ca_pull__(msg, cb0);
                                    } else {
                                        ca.__ca_process__(msg, cb0);
                                    }
                                }
                            ], processResponseF);
                    });
        };

        cb(null, that);
    } catch(err) {
        cb(err);
    }
};
