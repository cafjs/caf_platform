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
// @ts-ignore: augments not attached to a class

const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const async = caf_comp.async;
const genCron = caf_comp.gen_cron;

exports.newInstance = async function($, spec) {
    try {
        const that = genCron.constructor($, spec);

        const renewF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            const alive = $._.$.registry.__ca_allChildren__();
            const cb0 = function(err, gone) {
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
                            const msg = 'cron_lease: Cannot delete child ';
                            $._.$.log && $._.$.log.error(
                                msg + myUtils.errToPrettyStr(err)
                            );
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

        return [null, that];
    } catch (err) {
        return [err];
    }
};
