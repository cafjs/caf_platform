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
 * Processing pipeline for using a cache for responses.
 *
 *
 * @name pipe_compress
 * @namespace
 * @augments caf_components/gen_pipe
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var gen_pipe = require('./gen_pipe');
var url = require('url');
var querystring = require('querystring');

/**
 * Factory method to create a processing pipeline component for using a cache
 *  for responses.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_pipe.constructor($, spec);

        assert.equal(typeof spec.env.cacheService, 'string',
                      "'spec.env.cacheService' is not a string");
        var cs = spec.env.cacheService;

        $._.$.log && $._.$.log.debug('New response cache pipe');

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
                var sendReply = function (data) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type',
                                          'text/html; charset=utf-8');
                    res.end(data);
                };
                if ((req.method !== 'GET') || (!$._.$[cs])) {
                    next();
                } else {
                    var urlToParse = req.originalUrl || req.url;
                    var q = url.parse(urlToParse).query;
                    if (q) {
                        var entry = querystring.parse(q).cacheKey;
                        if (entry) {
                            var cb1 = function(err, data) {
                                if (err) {
                                    $._.$.log && $._.$.log
                                                .warn('Error in cache ' +
                                                      myUtils
                                                      .errToPrettyStr(err));
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

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
