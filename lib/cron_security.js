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
 *
 *  A cron job that performs security tasks.
 *
 * For example, cleaning caches of authenticated tokens to force re-validation.
 *
 * @module caf_platform/cron_security
 * @augments external:caf_components/gen_cron
 */
// @ts-ignore: augments not attached to a class
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genCron = caf_comp.gen_cron;

exports.newInstance = async function($, spec) {
    try {
        const that = genCron.create($, spec);

        // this function is bound as a method of 'that'
        const securityF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            const cb0 = function(err) {
                if (err) {
                    $._.$.log && $._.$.log.debug('pulser_cron ' +
                                                 myUtils.errToPrettyStr(err));
                } else {
                    $._.$.log && $._.$.log.debug('security pulsing done.');
                }
            };
            if ($._.$.security && $._.$.security.__ca_pulse__) {
                $._.$.security.__ca_pulse__(cb0);
            }
        };

        that.__ca_start__(securityF);

        $._.$.log && $._.$.log.debug('New security cron job');
        return [null, that];
    } catch (err) {
        return [err];
    }
};
