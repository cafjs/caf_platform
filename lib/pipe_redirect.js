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
 * Processing pipeline for redirecting a CA message to a different node.
 *
 * Properties:
 *
 *      {usePortRedirection: boolean}
 *
 * where:
 *
 *  * `usePortRedirection`: use port information for finding the
 * target.
 *
 * @module caf_platform/pipe_redirect
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const gen_pipe = require('./gen_pipe');
const json_rpc = require('caf_transport').json_rpc;

const REDIRECT_PREFIX = 'host';

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.create($, spec);

        assert.equal(typeof spec.env.usePortRedirection, 'boolean',
                     "'spec.env.usePortRedirection' not a boolean");
        $._.$.log && $._.$.log.debug('New redirect pipe');

        that.__ca_connectSetup__ = function(app) {
            const toURL = function(remoteNode) {
                const p = remoteNode.split(':');
                return REDIRECT_PREFIX + p[1] + '-' + p[0];
            };
            app.use(spec.env.path, function(req, res, next) {
                if (req.error && req.error.remoteNode) {
                    const remoteNode = spec.env.usePortRedirection ?
                        req.error.remoteNode :
                        toURL(req.error.remoteNode);
                    req.error.remoteNode = remoteNode;
                    const resp = json_rpc.redirect(req.body, 'Redirecting to ' +
                                                   remoteNode, req.error);
                    that.__ca_send__(res, resp);
                } else {
                    next();
                }
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
