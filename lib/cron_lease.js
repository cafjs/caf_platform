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
 *  A cron job that renews leases for healthy local CAs.
 *
 * @module caf_platform/cron_lease
 * @augments external:caf_components/gen_cron
 */

var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var genCron = caf_comp.gen_cron;

exports.newInstance = function($, spec, cb) {
    try {
        var that = genCron.constructor($, spec);

        var renewF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            var alive = $._.$.registry.__ca_allChildren__();
            var cb0 = function(err, gone) {
                if (err) {
                    $._.$.log && $._.$.log.error('Error:cannot renew leases' +
                                                 myUtils.errToPrettyStr(err));
                    /*
                     * All operations are conditional to a valid lease,
                     * and therefore, we do not need to explicitly kill all
                     * children. (Comment1)
                     */
                } else {
                    async.each(gone, function(id, cb1) {
                        $._.$.registry.__ca_deleteChild__(null, id, cb1);
                    }, function(err) {
                        if (err) {
                            var msg = 'cron_lease: Cannot delete child ';
                            $._.$.log && $._.$.log.error(msg + myUtils
                                                         .errToPrettyStr(err));
                        }
                        /*
                         * See Comment1 to why doing
                         *  nothing for recovery is still safe.
                         */
                    });
                }
            };
            $._.$.lease.renewLeases(alive, cb0);
        };
        that.__ca_start__(renewF);

        $._.$.log && $._.$.log.debug('New lease cron job');

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
