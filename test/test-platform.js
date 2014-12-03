var async = require('async');
var json_rpc = require('caf_transport');

var hello = require('./hello/main.js');

var app = hello;

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
    }
};
