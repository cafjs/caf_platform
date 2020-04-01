// Modifications copyright 2020 Caf.js Labs and contributors
/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

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
 * Generic message processing pipeline component.
 *
 * Properties:
 *
 *       {webSocketPipe: boolean, httpPipe: boolean, path: string}
 *
 * where:
 *
 *   * `webSocketPipe`: Whether this pipe should apply to websockets.
 *   * `httpPipe`: Whether this pipe should apply to http requests.
 *   * `path`: Route that activates this pipe.
 *
 * @module caf_platform/gen_pipe
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const gen_plug = caf_comp.gen_plug;

exports.create = function($, spec) {

    const that = gen_plug.create($, spec);

    assert.equal(typeof spec.env.webSocketPipe, 'boolean',
                 "'spec.env.webSocketPipe' is not a boolean");

    assert.equal(typeof spec.env.httpPipe, 'boolean',
                 "'spec.env.httpPipe' is not a boolean");

    assert.equal(typeof spec.env.path, 'string',
                 "'spec.env.path' is not a string");

    /**
     * Run-time type information.
     *
     * @type {boolean}
     *
     * @memberof! module:caf_platform/gen_pipe#
     * @alias __ca_isPipe__
     */
    that.__ca_isPipe__ = true;

    /**
     * Sends a reply on a websocket or an http post.
     *
     * @param {Object} res A response stream object.
     * @param {string|Object} data A JSON serialized object or an object to
     *  serialize.
     *
     * @memberof! module:caf_platform/gen_pipe#
     * @alias __ca_send__
     */
    that.__ca_send__ = function(res, data) {
        try {
            if (typeof data === 'object') {
                data = JSON.stringify(data);
            }
            if (typeof res.send === 'function') {
                res.send(data);
            } else {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(data);
            }
        } catch (error) {
            $._.$.log && $._.$.log.trace('Ignoring: Cannot send response ' +
                                         data + ' error: ' +
                                         myUtils.errToPrettyStr(error));
        }
    };

    /**
     * Whether this pipe should be added to the websocket pipeline.
     *
     * @return {boolean} True if this pipe should be added to the websocket
     *  pipeline.
     * @memberof! module:caf_platform/gen_pipe#
     * @alias __ca_isWebSocketPipe__
     */
    that.__ca_isWebSocketPipe__ = function() {
        return spec.env.webSocketPipe;
    };

    /**
     * Whether this pipe should be added to the http pipeline.
     *
     * @return {boolean} True if this pipe should be added to the http
     *  pipeline.
     *
     * @memberof! module:caf_platform/gen_pipe#
     * @alias __ca_isHttpPipe__
     */
    that.__ca_isHttpPipe__ = function() {
        return spec.env.httpPipe;
    };

    /**
     * Creates a `connect` middleware function with interface
     * `function(req, res, next)`, and registers it with the application.
     *
     * @param {Object} app A `connect` application to register a middleware
     *  function.
     *
     * @memberof! module:caf_platform/gen_pipe#
     * @alias __ca_connectSetup__
     */
    that.__ca_connectSetup__ = function(app) {
        // dummy example method, override...
        app.use(spec.env.path, function(req, res, next) {
            next();
        });
    };

    return that;
};
