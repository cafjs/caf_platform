// Modifications copyright 2020 Caf.js Labs and contributors
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
 *  A cron job that performs bookkeeping for the `nodes` lookup service.
 *
 *
 * @module caf_platform/cron_nodes
 * @augments external:caf_components/gen_cron
 */
// @ts-ignore: augments not attached to a class
const caf_comp = require('caf_components');
const myUtils = caf_comp.myUtils;
const genCron = caf_comp.gen_cron;

exports.newInstance = async function($, spec) {
    try {
        const that = genCron.create($, spec);

        const nodesF = function() {
            $._.$.log &&
                $._.$.log.debug('Cron ' + spec.name + ' waking up');
            const cb0 = function(err) {
                if (err) {
                    $._.$.log && $._.$.log.error('pulser_cron ' +
                                                 myUtils.errToPrettyStr(err));
                } else {
                    $._.$.log && $._.$.log.debug('nodes pulsing done.');
                }
            };
            if ($._.$.nodes && $._.$.nodes.__ca_pulse__) {
                $._.$.nodes.__ca_pulse__(cb0);
            }
        };

        that.__ca_start__(nodesF);

        $._.$.log && $._.$.log.debug('New nodes cron job');
        return [null, that];
    } catch (err) {
        return [err];
    }
};
