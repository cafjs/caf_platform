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
 * Processing pipeline for compressing responses.
 *
 *
 * @module caf_platform/pipe_compress
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const gen_pipe = require('./gen_pipe');
const compression = require('compression');

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.constructor($, spec);

        $._.$.log && $._.$.log.debug('New compression pipe');

        that.__ca_connectSetup__ = function(app) {
            const compress = compression();
            app.use(spec.env.path, function(req, res, next) {
                compress(req, res, next);
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
