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
"use strict";
/**
 *   A cron job that gets rid of  deadlocked CAs.
 *
 * @name cron_ripper
 * @namespace
 * @augments caf_components/gen_cron
 */

var async = require('async');
var caf_comp = require('caf_components');
var genCron = caf_comp.gen_cron;


/**
 * Factory method to create a ripper cron job.
 *
 * @see caf_components/supervisor
 * */
exports.newInstance = function($, spec, cb) {

    try {
        var that = genCron.constructor($, spec);

        var ripperF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            var all = $._.$.registry.__ca_allChildren__();
            var dead = all.filter(function(id) {
                                      var ca = $._.$.registry.$[id];
                                      return ca && !ca.__ca_progress__();
                                  });
            async.forEach(dead, function(id, cb0) {
                              $._.$.registry
                                  .__ca_deleteChild__(null, id, cb0);
                          }, function(err, data) {
                              if (err) {
                                  $._.$.log &&
                                      $._.$.log.debug('ripper_cron ' +
                                                 myUtils.errToPrettyStr(err));
                              } else {
                                  $._.$.log &&
                                      $._.$.log.debug('Got rid of ' +
                                                      JSON.stringify(dead));
                              }
                          });
        };
        that.__ca_start__(ripperF);

        $._.$.log && $._.$.log.debug('New ripper cron job');
        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
