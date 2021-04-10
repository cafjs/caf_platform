// Modifications copyright 2020 Caf.js Labs and contributors
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
 * Processing pipeline for using a caching service for responses.
 *
 * Properties:
 *
 *        {cacheService: string}
 *
 * where `cacheService` is the backend service for caching, i.e., `cp`.
 *
 * @module caf_platform/pipe_cache
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const gen_pipe = require('./gen_pipe');
const url = require('url');
const querystring = require('querystring');

exports.newInstance = async function($, spec) {
    try {
        const that = gen_pipe.create($, spec);

        assert.equal(typeof spec.env.cacheService, 'string',
                     "'spec.env.cacheService' is not a string");
        const cs = spec.env.cacheService;

        $._.$.log && $._.$.log.debug('New response cache pipe');

        that.__ca_connectSetup__ = function(app) {
            app.use(spec.env.path, function(req, res, next) {
                const sendReply = function (data) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                    res.end(data);
                };
                if ((req.method !== 'GET') || (!$._.$[cs])) {
                    next();
                } else {
                    const urlToParse = req.originalUrl || req.url;
                    const q = url.parse(urlToParse).query;
                    if (q) {
                        const entry = querystring.parse(q).cacheKey;
                        if (entry) {
                            const cb1 = function(err, data) {
                                if (err) {
                                    $._.$.log && $._.$.log.warn(
                                        'Error in cache ' +
                                            myUtils.errToPrettyStr(err)
                                    );
                                    next();
                                } else {
                                    if (data) {
                                        sendReply(data);
                                    } else {
                                        next();
                                    }
                                }
                            };
                            $._.$[cs].getCache(entry, cb1);
                        } else {
                            next();
                        }
                    } else {
                        next();
                    }
                }
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
