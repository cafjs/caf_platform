var async = require('async');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var json_rpc = require('caf_transport');

var hello = require('./hello/main.js');

var app = hello;

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
                              cb(err, $);
                          }
                      });
    },
    tearDown: function (cb) {
        var self = this;
        if (!this.$) {
            cb(null);
        } else {
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
                             async
                                 .each(all,
                                          function(x, cb1) {
                                              var ca = self.$._.$.registry.$[x];
                                              var msg = newMsg(x, 'default',
                                                               'hello', 'hi');
                                              async.series([
                                                               function(cb2) {
                                                                   ca.__ca_process__(msg, cb2);
                                                               },
                                                               function(cb2) {
                                                                   ca.__ca_process__(msg, cb2);
                                                               },
                                                               function(cb2) {
                                                                   ca.__ca_process__(msg, cb2);
                                                               },
                                                               function(cb2) {
                                                                   ca.__ca_process__(msg, cb2);
                                                               },
                                                               function(cb2) {
                                                                   ca.__ca_process__(msg, cb2);
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
console.log(JSON.stringify(data));
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

                         test.done();
                     });
    }
};
