var async = require('async');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var json_rpc = require('caf_transport');
var WebSocket = require('ws');
var request = require('request');

var hello = require('./hello/main.js');
var pipeline = require('./pipeline/main.js');

var app = hello;

var HOST='localhost';
var PORT=3000;

process.on('uncaughtException', function (err) {
               console.log("Uncaught Exception: " + err);
               console.log(myUtils.errToPrettyStr(err));
               process.exit(1);

});

var newMsg = function(ca, sessionId, methodName, arg1) {
    var msg = json_rpc.systemRequest(ca, methodName);
    if (arg1 === undefined) {
        return json_rpc.request(json_rpc.getToken(msg), json_rpc.getTo(msg),
                                json_rpc.getFrom(msg), sessionId,
                                methodName);
    } else {
        return json_rpc.request(json_rpc.getToken(msg), json_rpc.getTo(msg),
                                json_rpc.getFrom(msg), sessionId,
                                methodName, arg1);
    }
};

module.exports = {
    setUp: function (cb) {
        var self = this;
        app.load(null, {name: 'top'}, 'framework.json', null,
                      function(err, $) {
                          if (err) {
                              console.log('setUP Error' + err);
                              console.log('setUP Error $' + $);
                              // ignore errors here, check in method
                              cb(null);
                          } else {
                              self.$ = $;
                              self.ws = new WebSocket('ws://'+ HOST + ':' +
                                                      PORT);
                              self.ws.on('open', function() {
                                             cb(err, $);
                                         });
                          }
                      });
    },
    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
            this.ws.close();
            this.ws.removeAllListeners();
            this.$.top.__ca_shutdown__(null, cb);
        }
    },

    helloworld: function (test) {
        var self = this;

        test.expect(3);
        async.series([
                         function(cb) {
                             self.$._.$.registry
                                 .__ca_instanceChild__(null, { name : 'ca1'},
                                                       cb);
//                                        test.ok($.ca1.__ca_progress__());
//                                        test.equals($.ca1.__ca_getName__(),
//                                                   'ca1');
                         },
                         function(cb) {
                             test.equals(typeof self.$._.$.registry.$.ca1,
                                         'object');
                             test.equals(self.$._.$.registry.$.ca1
                                         .__ca_getName__(),
                                         'ca1');
                             setTimeout(function() {
                                            cb(null);
                                        }, 2000);
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    many: function(test) {

        var self = this;
        var all = [];
        var NCAs = 1000;
        for (var i =0; i<NCAs; i++) {
            all.push('ca'+i);
        }

        var testCAs = function() {
            var allOK = true;
            all.forEach(function(x) {
                            var isObj =
                                (typeof self.$._.$.registry.$[x] === 'object');
                            if (!isObj) {
                                console.log(x + ' not an object');
                            }
                            allOK = allOK && isObj;
                        });
            console.log('isOK:' +allOK);
            return allOK;
        };

        test.expect(8);
        var t1, t2, t3, t4, t5, t6;
        async.series([
                         function(cb) {
                             t1 = (new Date()).getTime();
                             async
                                 .each(all,
                                          function(x, cb1) {
                                              self.$._.$.registry
                                                  .__ca_instanceChild__(null,
                                                                        { name :
                                                                          x},
                                                                        cb1);
                                          }, cb);
                         },
                         function(cb) {
                             t2 = (new Date()).getTime();
                             console.log("Time to create " + NCAs + " CAs: "
                                         + (t2-t1));
                             test.equals(typeof self.$._.$.registry.$.ca7,
                                         'object');
                             test.equals(self.$._.$.registry.$.ca7
                                         .__ca_getName__(),
                                         'ca7');
                             test.ok(testCAs());
                             setTimeout(function() {
                                            test.ok(testCAs());
                                            cb(null);
                                        }, 10000);
                         },
                         function(cb) {
                             t3 = (new Date()).getTime();
                             async.each(all,
                                        function(x, cb1) {
                                            var ca = self.$._.$.registry.$[x];
                                            var msg = newMsg(x, 'default',
                                                             'hello', 'hi');
                                            async.series(
                                                [
                                                    function(cb2) {
                                                        ca.__ca_process__(msg,
                                                                          cb2);
                                                    },
                                                    function(cb2) {
                                                        ca.__ca_process__(msg,
                                                                          cb2);
                                                    },
                                                    function(cb2) {
                                                        ca.__ca_process__(msg,
                                                                          cb2);
                                                    },
                                                    function(cb2) {
                                                        ca.__ca_process__(msg,
                                                                          cb2);
                                                    },
                                                    function(cb2) {
                                                        ca.__ca_process__(msg,
                                                                          cb2);
                                                    }
                                                ], cb1);
                                        }, cb);
                         },
                         function(cb) {
                             t4 = (new Date()).getTime();
                             console.log("Time to process " + 5*NCAs + " msgs: "
                                         + (t4-t3));
                             var ca = self.$._.$.registry.$['ca99'];
                             var msg = newMsg('ca99', 'default',
                                              'getLastMessage');
                             var cb1 = function(err, data) {
                                 test.ifError(err);
                                 var resp =
                                     json_rpc.getAppReplyData(data);
                                 test.equals(resp, 'hi');
                                 cb(err, data);
                             };
                             ca.__ca_process__(msg, cb1);
                         },

                         function(cb) {
                             t5 = (new Date()).getTime();
                             async
                                 .each(all,
                                          function(x, cb1) {
                                              var reg = self.$._.$.registry;
                                              reg.__ca_deleteChild__ (null, x,
                                                                      cb1);
                                          }, cb);
                         }

                     ], function(err, res) {
                         t6 = (new Date()).getTime();
                          console.log("Time to delete " + NCAs + " CAs: "
                                         + (t6-t5));
                         test.equals(typeof self.$._.$.registry.$.ca7,
                                     'undefined');
                         test.ifError(err);
                         app = pipeline;
                         test.done();
                     });
    },
    ping: function(test) {
        var self = this;
        test.expect(4);
        async.series([
                         function(cb) {
                             var msg = newMsg('antonio-test1', 'default',
                                              'ping', 'bar');
                             self.ws.send(JSON.stringify(msg));
                             self.ws.on('message', function(resp) {
                                            console.log(resp);
                                            var ind =
                                                resp.indexOf('Hello world fr');
                                            test.equals(ind, 0);
                                            cb(null);
                                        });
                         },
                         function(cb) {
                             var msg = newMsg('antonio-test1', 'default',
                                              'ping', 'bar');
                             request({
                                         method: 'POST',
                                         url:'http://localhost:3000/ping',
                                         json:true,
                                         body: msg
                                     }, function (error, response, body) {
                                         test.ifError(error);
                                         console.log(body);
                                            var ind =
                                                body.indexOf('Hello world fr');
                                            test.equals(ind, 0);
                                            cb(null);
                                     });
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    hello: function(test) {
        var self = this;
        test.expect(5);
        var checkResponse = function(err, data) {
            test.ifError(err);
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            var resp = json_rpc.getAppReplyData(data);
            test.equals(resp, 'Bye:bar');
        };
        async.series([
                         function(cb) {
                             var msg = newMsg('antonio-test1', 'default',
                                              'hello', 'bar');
                             self.ws.send(JSON.stringify(msg));
                             self.ws.on('message', function(resp) {
                                            console.log(resp);
                                            checkResponse(null, resp);
                                            cb(null);
                                        });
                         },
                         function(cb) {
                             var msg = newMsg('antonio-test1', 'default',
                                              'hello', 'bar');
                             request({
                                         method: 'POST',
                                         url:'http://localhost:3000/ca',
                                         json:true,
                                         body: msg
                                     }, function (error, response, body) {
                                         checkResponse(null, body);
                                         cb(null);
                                     });
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    rubbish: function(test) {
        var self = this;
        test.expect(3);
        async.series([
                         function(cb) {
                             self.ws.send('{something that does not parse}');
                             self.ws.on('message', function(data) {
                                            console.log(data);
                                            data = JSON.parse(data);
                                            var resp =
                                                json_rpc
                                                .getSystemErrorCode(data);
                                            console.log(JSON.stringify(resp));
                                            test.equals(resp,
                                                        json_rpc.ERROR_CODES.
                                                        invalidParams);
                                            self.ws
                                                .removeAllListeners('message');
                                            cb(null);
                                        });
                         },
                         function(cb) {
                             var msg = newMsg('antonio-test1', 'default',
                                              'foo', 'bar');
                             self.ws.send(JSON.stringify(msg));
                             self.ws.on('message', function(data) {
                                            console.log(data);
                                            data = JSON.parse(data);
                                            var resp =
                                                json_rpc
                                                .getSystemErrorCode(data);
                                            console.log(JSON.stringify(resp));
                                            test.equals(resp,
                                                        json_rpc.ERROR_CODES.
                                                        methodNotFound);
                                            cb(null);
                                        });
                         }
                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    },
    nodes: function(test) {
        var self = this;
        test.expect(6);
        var checkResponse = function( data) {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            var resp = json_rpc.getAppReplyData(data);
            test.equals(resp, 'Bye:bar');
        };
        var checkRedirect = function( data) {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            var resp = json_rpc.getSystemErrorCode(data);
            console.log(JSON.stringify(resp));
            test.equals(resp, json_rpc.ERROR_CODES.forceRedirect);
        };
        async.series([
                         function(cb) {
                             var nodes = self.$._.$.nodes;
                             var doneChange = false;
                             nodes.onChange(function(v) {
                                                if (!doneChange) {
                                                    var all = self.$._.$.nodes
                                                        .getAllPublicNodeIds();
                                                    console.log(all);
                                                    test.equals(all.length, 11);
                                                    var k = Object
                                                        .keys(nodes.$);
                                                    k = k
                                                        .filter(function(x) {
                                                                   return nodes
                                                                       .$[x];
                                                                });
                                                    test.equals(k.length, 2);
                                                    doneChange = true;
                                                }
                                            });
                             process.env['VCAP_APP_PORT']="3001";
                             app.load(null, {name: 'top'}, 'framework.json',
                                      null, function(err, $2) {
                                          if (err) {
                                              console.log('setUP Error' + err);
                                              console.log('setUP Error $' + $);
                                              cb(null);
                                          } else {
                                              self.$2 = $2;
                                              self.ws2 = new WebSocket('ws://'+
                                                                       HOST +
                                                                       ':' +
                                                                       3001);
                                              self.ws2.on('open',
                                                          function() {
                                                              setTimeout(
                                                                  function() {
                                                                      cb(err,
                                                                         $2);
                                                                  },
                                                                  10000);
                                                          });
                                          }
                                      });
                         },
                         function(cb) {
                             var msg = newMsg('antonio-test2', 'default',
                                              'hello', 'bar');
                             self.ws2.send(JSON.stringify(msg));
                             self.ws2.on('message', function(resp) {
                                            console.log(resp);
                                            checkResponse(resp);
                                             self.ws2
                                                 .removeAllListeners('message');
                                            cb(null);
                                        });
                         },
                         function(cb) {
                             // fail with a redirect
                             var msg = newMsg('antonio-test2', 'default',
                                              'hello', 'bar');
                             self.ws.send(JSON.stringify(msg));
                             self.ws.on('message', function(resp) {
                                            console.log(resp);
                                            checkRedirect(resp);
                                            self.ws
                                                .removeAllListeners('message');
                                            cb(null);
                                        });
                         },
                         function(cb) {
                             delete process.env['VCAP_APP_PORT'];
                             var cb1 = function(err, data) {
                                 self.ws2.close();
                                 self.ws2.removeAllListeners();
                                 setTimeout(function() {
                                                //expire lease
                                                cb(err, data);
                                            }, 20000);
                             };
                             self.$2.top.__ca_shutdown__(null, cb1);
                         },
                         function(cb) {
                             // now succeeds due to ws2 shutdown
                             var msg = newMsg('antonio-test2', 'default',
                                              'hello', 'bar');
                             self.ws.send(JSON.stringify(msg));
                             self.ws.on('message', function(resp) {
                                            console.log(resp);
                                            checkResponse(resp);
                                            self.ws
                                                .removeAllListeners('message');
                                            cb(null);
                                        });
                         }

                     ], function(err, res) {
                         test.ifError(err);
                         test.done();
                     });
    }
};
