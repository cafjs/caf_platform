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
 * A cron job that allows CAs to do autonomous actions even when they
 * have no pending messages.
 *
 * @module caf_platform/cron_pulser
 * @augments external:caf_components/gen_cron
 */
// @ts-ignore: augments not attached to a class
const caf_comp = require('caf_components');
const async = caf_comp.async;
const myUtils = caf_comp.myUtils;
const genCron = caf_comp.gen_cron;

exports.newInstance = async function($, spec) {
    try {
        const that = genCron.create($, spec);

        const pulserF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            const alive = $._.$.registry.__ca_allChildren__();
            async.each(alive, function(id, cb0) {
                const ca = $._.$.registry.$[id];
                if (!ca || ca.__ca_isShutdown__) {
                    // avoid a race...
                    cb0(null);
                } else {
                    ca.__ca_pulse__(cb0);
                }
            }, function(err) {
                if (err) {
                    $._.$.log && $._.$.log.debug('cron_pulser:' +
                                                 myUtils.errToPrettyStr(err));
                } else {
                    $._.$.log && $._.$.log.debug('pulsing done.');
                }
            });
        };

        that.__ca_start__(pulserF);

        $._.$.log && $._.$.log.debug('New pulser cron job');
        return [null, that];
    } catch (err) {
        return [err];
    }
};
