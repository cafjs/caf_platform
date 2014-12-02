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
 *   A cron job that allows CAs to do autonomous actions when they
 * have no pending messages.
 *
 * @name cron_pulser
 * @namespace
 * @augments caf_components/gen_cron
 */

var async = require('async');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genCron = caf_comp.gen_cron;



/**
 * Factory method to create a pulser cron job.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genCron.constructor($, spec);

        var pulserF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            var alive = $._.$.registry.__ca_allChildren__();
            async.each(alive, function(id, cb0) {
                           var ca = $._.$.registry.$[id];
                           if (!ca || ca.__ca_isShutdown__) {
                               // avoid a race...
                               cb0(null);
                           } else {
                               ca.__ca_pulse__(cb0);
                           }
                       }, function(err) {
                           if (err) {
                               $._.$.log &&
                                   $._.$.log.debug('cron_pulser:' +
                                                   myUtils.errToPrettyStr(err));
                           } else {
                               $._.$.log && $._.$.log.debug('pulsing done.');
                           }
                       });
        };
        that.__ca_start__(pulserF);

        $._.$.log && $._.$.log.debug('New pulser cron job');
        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
