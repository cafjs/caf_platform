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
 * Main processing pipeline for CA messages.
 *
 * Contains an array of stateless pipes using an extended
 * `connect` middleware that supports websockets:
 *
 * Internally we have two 'connect' pipelines: one for websockets and the other
 * one for http requests. Pipe configuration will select one (or both) of
 *  these pipelines.
 *
 * Each pipe also provides a `connectSetup(app)` method that will register a
 *  standard 'connect' function interface, i.e.,  `function(req, res, next)`.
 *
 * Typically 'connect' uses stream interfaces on req/res to read the input
 *  and respond. Instead, websockets overlay a message interface by
 * adding the input message to `req.body`. We also guarantee that the response
 * is sent in a single `ws.send` call.
 *
 * This allow us to easily switch to a plain http interface (no websockets) by
 * adding the connect `bodyParser` middleware, which creates `req.body`.
 *
 * Properties:
 *
 *        {specialMethods: Array.<string>}
 *
 * where:
 *
 * * `specialMethods`: special routes associated with a custom function, e.g.,
 * `ping` or `stats`.
 *
 * @module caf_platform/pipeline_main
 * @augments external:caf_components/gen_container
 */
// @ts-ignore: augments not attached to a class

const assert = /**@ignore @type {typeof import('assert')} */(require('assert'));
const connect = require('connect');
const WebSocketServer = require('ws').Server;
const json_rpc = require('caf_transport').json_rpc;
const caf_comp = require('caf_components');
const gen_container = caf_comp.gen_container;
const myUtils = caf_comp.myUtils;

exports.newInstance = function($, spec, cb) {
    try {
        const connections = {};// track connections for fast shutdown

        const wsFinalHandler = function(req, res) {
            return function(err) {
                err = err || new Error('wsFinalHandler error');
                err.msg = req.body;
                const code = json_rpc.ERROR_CODES.methodNotFound;
                const error = json_rpc.newSysError(req.body, code,
                                                   'Method not found', err);
                const response = JSON.stringify(json_rpc.reply(error));
                $._.$.log && $._.$.log.trace(response);
                res.send(response);
            };
        };

        const that = gen_container.create($, spec);
        const port = ($._.$.paas && $._.$.paas.getAppInternalPort()) ||
                  spec.env.port;
        assert.equal(typeof port, 'number', "'port' not a number");
        const specialMethods = spec.env.specialMethods;
        assert.ok(Array.isArray(specialMethods),
                  "'spec.env.specialMethods' is not an array");
        const specialMethodsObj = {};
        specialMethods.forEach(function(x) { specialMethodsObj[x] = true;});

        const app = connect();
        const appWS = connect();
        const pipesSpec = that.__ca_getChildrenSpec__();
        var server = null;
        var wss = null;

        const extractURL = function(msgObj) {
            return specialMethodsObj[msgObj.method] ?
                '/' + msgObj.method :
                '/ca';
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            super__ca_shutdown__(data, function(err, res) {
                if (err) {
                    cb0(err, res);
                } else {
                    if (wss) {
                        wss.close();
                    }
                    if (server) {
                        const s = server;
                        server = null;
                        s.close(cb0);
                        Object.keys(connections).forEach(function(x) {
                            connections[x].destroy();
                        });
                    } else {
                        cb0(err, res);
                    }
                }
            });
        };

        const initF = function (err) {
            try {
                if (err) {
                    cb(err);
                } else {
                    pipesSpec.forEach(function(pipeSpec) {
                        const pipe = that.$[pipeSpec.name];
                        if (pipe.__ca_isWebSocketPipe__()) {
                            pipe.__ca_connectSetup__(appWS);
                        }
                        if (pipe.__ca_isHttpPipe__()) {
                            pipe.__ca_connectSetup__(app);
                        }
                    });
                    $._.$.log && $._.$.log.debug('Listen on port ' + port);
                    server = app.listen(port);
                    server
                        .on('error', function(err) {
                            $._.$.log && $._.$.log.warn(err);
                            that.__ca_shutdown__(null, function(err1) {
                                if (err1) {
                                    $._.$.log && $._.$.log.warn(err1);
                                }
                            });
                        })
                        .on('connection', function(con) {
                            const key = con.remoteAddress + ':' +
                                      con.remotePort;
                            connections[key] = con;
                            con.on('close', function() {
                                delete connections[key];
                            });
                        });

                    wss = new WebSocketServer({server: server});
                    wss.on('connection', function(ws) {
                        ws.on('message', function(msg) {
                            try {
                                const msgStr = /** @type String*/ (msg);
                                const msgObj = JSON.parse(msgStr);
                                const req = {
                                    url: extractURL(msgObj),
                                    body: msgObj
                                };
                                const wsFH = wsFinalHandler(req, ws);
                                // @ts-ignore: mock up req with only the url
                                appWS(req, ws, wsFH);
                            } catch (err) {
                                const sysErr = json_rpc.newSysError(
                                    msg, json_rpc.ERROR_CODES.invalidParams,
                                    'Invalid params', err
                                );
                                const reply = json_rpc.reply(sysErr);
                                ws.send(JSON.stringify(reply));
                            }
                        });
                        ws.on('close', function() {
                            const err = 'Closing WS session';
                            $._.$.log && $._.$.log.trace(err);
                        });
                        ws.on('error', function(err) {
                            $._.$.log && $._.$.log.warn(err);
                            that.__ca_shutdown__(null, function() {});
                        });
                    });
                    cb(null, that);
                }
            } catch (err) {
                cb(err);
            }
        };

        // Initializate children first.
        that.__ca_checkup__(null, initF);
    } catch (err) {
        cb(err);
    }
};
