/*!
Copyright 2022 Caf.js Labs and contributors

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
 * Processing pipeline for handling webhook requests.
 *
 *
 * @module caf_platform/pipe_webhook
 * @augments external:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const gen_pipe = require('./gen_pipe');
const url = require('url');
const assert = require('assert');

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.create($, spec);

        $._.$.log && $._.$.log.debug('New webhook pipe');

        assert.equal(typeof(spec.env.signatureHeader), 'string',
                     "'spec.env.signatureHeader' is not a string");

        const signatureHeader = spec.env.signatureHeader.toLowerCase();

        that.__ca_connectSetup__ = function(app) {
            app.use(spec.env.path, async function(req, res, next) {
                const sendReply = function (data) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(data);
                };

                if ($._.$.webhook && (req.method === 'POST')) {
                    try {
                        const signature = req.headers[signatureHeader];
                        const p = req.url && url.parse(req.url).pathname;
                        const pathName = p.split('/');
                        const id = pathName[2]; // e.g., foo-ca1-xxx
                        await $._.$.webhook.propagate(id, req.body, signature);
                        sendReply('OK');
                    } catch (err) {
                        const errMsg = myUtils.errToPrettyStr(err);
                        $._.$.log && $._.$.log.debug(
                            `Error processing a webhook ${errMsg}`
                        );
                        // Do NOT force a retry by returning an http error
                        sendReply(errMsg);
                    }
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
