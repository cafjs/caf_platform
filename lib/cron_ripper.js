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
 *  A cron job that gets rid of deadlocked CAs.
 *
 * @module caf_platform/cron_ripper
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

        const ripperF = function() {
            $._.$.log && $._.$.log.debug('Cron ' + spec.name + ' waking up');
            const all = $._.$.registry.__ca_allChildren__();
            const dead = all.filter(function(id) {
                const ca = $._.$.registry.$[id];
                return ca && !ca.__ca_progress__();
            });
            async.forEach(dead, function(id, cb0) {
                $._.$.registry.__ca_deleteChild__(null, id, cb0);
            }, function(err) {
                if (err) {
                    $._.$.log && $._.$.log.debug('ripper_cron ' +
                                                 myUtils.errToPrettyStr(err));
                } else {
                    if (Array.isArray(dead) && (dead.length > 0)) {
                        $._.$.log && $._.$.log.warn('Got rid of ' +
                                                    JSON.stringify(dead));
                    } else {
                        $._.$.log && $._.$.log.debug('Got rid of ' +
                                                     JSON.stringify(dead));
                    }
                }
            });
        };

        that.__ca_start__(ripperF);

        $._.$.log && $._.$.log.debug('New ripper cron job');
        return [null, that];
    } catch (err) {
        return [err];
    }
};
