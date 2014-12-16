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
 * Internally we have two 'connect' pipelines, one for websockets and the other
 * one for (mostly) static requests. Pipe configuration will select one of
 *  these two targets.
 *
 * Each pipe also provides a `connectSetup(app)` method that will register a
 *  standard 'connect' interface `function(req, res, next).
 *
 * Typically 'connect' uses stream interfaces on req/res to read the input
 *  and respond. Instead, for websockets we overlay a message interface by
 * adding the input message to `req.body`. We also guarantee that the response
 * is sent in a single 'ws.send' call.
 *
 * This allow us to switch to plain http interface (no websockets) by adding the
 *  connect 'bodyParser' middleware that creates 'req.body'.
 *
 * Configuration in framework.json:
 *
 *     {
 *        "module": "pipeline_main",
 *        "name": "pipeline",
 *        "env": {
 *           "maxRetries": 10,
 *           "retryDelay": 1000,
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
 *
 * @name pipeline_main
 * @namespace
 * @augments caf_components/gen_container
 */

var connect = require('connect');
var WebSocketServer = require('ws').Server;
var json_rpc = require('caf_transport');
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
        var port = ($._.$.paas && $._.$.paas.getAppPort()) || spec.env.port;
        assert.equal(typeof port, 'number', "'port' not a number");
        var specialMethods = spec.env.specialMethods;
        assert.ok(Array.isArray(specialMethods),
                  "'spec.env.specialMethods' is not an array");
        var specialMethodsObj = {};
        specialMethods.forEach(function(x) { specialMethodsObj[x] = true;});

        var app = connect();
        var appWS = connect();
        var pipesSpec = that.__ca_getChildrenSpec__();

        var extractURL = function(msgObj) {
            return (specialMethodsObj[msgObj.method] ?  '/' + msgObj.method :
                    '/ca');
        };

        var initF = function (err) {
            try {
                if (err) {
                    cb(err);
                } else {
                    pipesSpec.forEach(function(pipeSpec) {
                                          var pipe = that.$[pipeSpec.name];
                                          if (pipe.__ca_isWebSocketPipe__()) {
                                              pipe.__ca_connectSetup__(appWS);
                                          } else {
                                              pipe.__ca_connectSetup__(app);
                                          }
                                      });
                    app.listen(port);
                    var wss = new WebSocketServer({server: app});
                    wss.on('connection', function(ws) {
                               ws.on('message', function(msg) {
                                         try {
                                             var msgObj = JSON.parse(msg);
                                             var req = {
                                                 url: extractURL(msgObj),
                                                 body : msgObj
                                             };
                                             appWS(req, ws);
                                         } catch(err) {
                                             var sysErr;
                                             sysErr = json_rpc
                                                 .newSysError(msg,
                                                              ERROR_CODES
                                                              .invalidParams,
                                                              'Invalid params',
                                                              json_rpc
                                                              .ERROR_CODES
                                                              .invalidParams,
                                                              err);
                                             var reply = json_rpc.reply(sysErr);
                                             ws.send(JSON.stringify(reply));
                                         }
                                     });
                               ws.on('close', function() {
                                         var err = 'Closing WS session';
                                         $._.$.log && $._.$.log.trace(err);
                                     });
                               ws.on('error', function(err) {
                                         $._.$.log && $._.$.log.error(err);
                                         // TBD: Shall I shutdown pipeline?
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
        console.log('got err' + myUtils.errToPrettyStr(err));
        cb(err);
    }
};
