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
 * Main processing pipeline for CA messages based on `connect` middleware.
 *
 * Contains an array of stateless pipes using an extended
 * 'connect' middleware that supports websockets:
 *
 * Each pipe provides a `connectSetup()` method that returns a function with
 * interface `function(req, res, next)`.
 *
 * Conventional 'connect' uses stream interfaces on req/res to read the input
 *  and respond. Instead, we overlay a message interface by adding the input
 * message to req.body, and the response message to res.body.
 *
 * To support a plain http interface (no websockets) we can use the standard
 *  connect 'bodyParser' middleware that creates 'req.body', and serialize
 *  `res.body` over the response stream.
 *
 *
 * Configuration in framework.json:
 *
 *     {
 *        "module": "pipeline_main",
 *        "name": "pipeline",
 *        "env": {
 *           "maxRetries": 10,
 *           "retryDelay": 1000,
 *           "relPublicPath" : "../../../public"
 *        },
 *        "components" : [
 *               {
 *                  "module": "pipe_dispatcher",
 *                   "name": "dispatcher",
 *                   "env": {
 *                      ....
 *                    }
 *                },
 *                {
 *                   ...
 *
 *                 }
 *        ]
 *      }
 *
 *  where:
 *
 *   -  *"relPublicPath"* is a relative directory path starting from where this
 * file will be found at run-time (typically
 * <yourapptopdir>/node_modules/caf_platform/lib/pipe_main.js) to the
 * public directory  with your app static web pages (e.g.,
 * <yourapptopdir>/public).
 *
 *
 *
 * @name pipeline_main
 * @namespace
 * @augments caf_components/gen_container
 */

var caf_comp = require('caf_components');
var gen_container =  caf_comp.gen_container;
var myUtils = caf_comp.myUtils;

/**
 * Factory method to create a supervisor component.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = gen_container.constructor($, spec);


       cb(null, that);
    } catch (err) {
        console.log('got err' + myUtils.errToPrettyStr(err));
        cb(err);
    }
};
