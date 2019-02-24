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
 * Processing pipeline for dispatching messages to CAs.
 *
 *
 * @module caf_platform/pipe_dispatcher
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
var caf_comp = require('caf_components');
var async = caf_comp.async;
var gen_pipe = require('./gen_pipe');
var json_rpc = require('caf_transport').json_rpc;

exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New dispatcher pipe');

        var isBackchannel = function(msg) {
            return (msg.method === 'backchannel');
        };

        that.__ca_connectSetup__ = function(app) {
            app.use(spec.env.path, function(req, res, next) {
                var msg = req.body;
                var from = json_rpc.getFrom(msg);
                var caId = json_rpc.getTo(msg);
                var blockCreate = $._.$.security &&
                        $._.$.security.__ca_blockCreate__(from, caId);
                var startTime = (new Date()).getTime();
                var profilerStartTime = null;
                var processResponseF = function(err, resp) {
                    var sendError = function(error) {
                        that.__ca_send__(res, json_rpc.reply(error));
                    };
                    // errors may bias latency but not the length of the queue
                    if (profilerStartTime) {
                        $._.$.profiler && $._.$.profiler
                            .msgEnd(profilerStartTime);
                        profilerStartTime = null;
                    }
                    if (err) {
                        if (err.noSuchCA) {
                            var code = json_rpc.ERROR_CODES.noSuchCA;
                            var error = json_rpc
                                    .newSysError(msg, code, 'No such CA', err);
                            sendError(error);
                        } else if (err.remoteNode) {
                            // force a redirect with the next pipe
                            req.error = err;
                            next();
                        } else if (err.notAuthorized) {
                            // cannot create a CA.
                            code = json_rpc.ERROR_CODES.notAuthorized;
                            error = json_rpc
                                .newSysError(msg, code, 'Block create CA', err);
                            sendError(error);
                        } else if (err.quotaExceeded) {
                            // no quota left.
                            code = json_rpc.ERROR_CODES.quotaExceeded;
                            error = json_rpc
                                .newSysError(msg, code, 'Quota exceeded', err);
                            sendError(error);
                        } else {
                            code = json_rpc.ERROR_CODES
                                .internalError;
                            error = json_rpc.newSysError(msg, code,
                                                         'Internal Error', err);
                            sendError(error);
                        }
                    } else {
                        var endTime = (new Date()).getTime();
                        json_rpc.patchMeta(resp, {
                            startTime: startTime,
                            endTime: endTime
                        });
                        that.__ca_send__(res, resp);
                    }
                };

                var target = $._.$.registry.$[caId];

                async.waterfall([
                    function(cb0) {
                        try {
                            if (!target) {
                                if ($._.$.security) {
                                    if (blockCreate) {
                                        // not owner, just check, do not renew
                                        $._.$.security.__ca_quotaCheck__(caId,
                                                                         cb0);
                                    } else {
                                        var token = json_rpc.getToken(msg);
                                        $._.$.security
                                            .__ca_quotaRenew__(token, cb0);
                                    }
                                } else {
                                    cb0(null, 'Security disabled: No check');
                                }
                            } else {
                                cb0(null, 'Locally available');
                            }
                        } catch (err) {
                            cb0(err);
                        }
                    },
                    function(info, cb0) {
                        $._.$.log && $._.$.log.trace('Pipe_dispatcher:' + info);
                        try {
                            if (target) {
                                cb0(null, target);
                            } else {
                                var spec = {
                                    name: caId,
                                    env: {
                                        blockCreate: blockCreate
                                    }
                                };
                                $._.$.registry
                                    .__ca_instanceChild__(null, spec, cb0);
                            }
                        } catch (ex) {
                            cb0(ex);
                        }
                    },
                    function(ca, cb0) {
                        if (isBackchannel(msg)) {
                            ca.__ca_pull__(msg, cb0);
                        } else {
                            profilerStartTime =
                                ($._.$.profiler &&
                                 $._.$.profiler.msgBegin()) || null;
                            ca.__ca_process__(msg, cb0);
                        }
                    }
                ], processResponseF);
            });
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
