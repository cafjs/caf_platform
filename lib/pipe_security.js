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
 * Processing pipeline for security checks.
 *
 * @module caf_platform/pipe_security
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const gen_pipe = require('./gen_pipe');
const json_rpc = require('caf_transport').json_rpc;

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.create($, spec);

        $._.$.log && $._.$.log.debug('New security pipe');

        that.__ca_connectSetup__ = function(app) {
            if ($._.$.security) {
                app.use(spec.env.path, function(req, res, next) {
                    const msg = req.body;
                    const sendError = function(err) {
                        const code = json_rpc.ERROR_CODES.notAuthenticated;
                        const error = json_rpc.newSysError(msg, code,
                                                           'Not Authenticated',
                                                           err);
                        that.__ca_send__(res, json_rpc.reply(error));
                    };
                    const from = json_rpc.getFrom(msg);
                    const token = json_rpc.getToken(msg);
                    $._.$.security.__ca_authenticate__(from, token,
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
            }
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
