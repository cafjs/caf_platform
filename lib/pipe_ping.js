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
 * Processing pipeline for pinging a node.
 *
 *
 * @module caf_platform/pipe_ping
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const gen_pipe = require('./gen_pipe');

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.create($, spec);

        $._.$.log && $._.$.log.debug('New ping pipe');

        that.__ca_connectSetup__ = function(app) {
            app.use(spec.env.path, function(req, res) {
                const pub = $._.$.nodes && $._.$.nodes.getNodeId();
                const priv = $._.$.nodes &&
                          $._.$.nodes.getPrivateNodeId();
                that.__ca_send__(res, 'Hello world from ' + pub +
                                 ' (private ID is ' + priv + ')');
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
