/*!
Copyright  2020 Caf.js Labs and contributors

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
 * Ensures that a CA is running in one of the nodes, otherwise it creates the CA
 * locally.
 *
 * This component should always initialize **after** the rest of the pipeline.
 *
 * @module caf_platform/plug_defaultCA
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class

const assert = require('assert');
const caf_comp = require('caf_components');
const genPlug = caf_comp.gen_plug;
const json_rpc = require('caf_transport').json_rpc;
const util = require('util');

exports.newInstance = async function($, spec) {
    const that = genPlug.create($, spec);
    try {
        const CAId = spec.env.defaultCAId;
        assert.equal(typeof CAId, 'string',
                     "'spec.env.CAId' is not a string");

        if (!$._.$.registry.$[CAId]) {
            const spec = {
                name: CAId,
                env: {
                    blockCreate: false
                }
            };

            const instanceChildAsync =
                  util.promisify($._.$.registry.__ca_instanceChild__);

            const ca = await instanceChildAsync(null, spec);
            const msg = json_rpc.systemRequest(CAId, '__external_ca_touch__');
            const processAsync = util.promisify(ca.__ca_process__);
            await processAsync(msg);
        }

        return [null, that];
    } catch (err) {
        if (err.remoteNode) {
            $._.$.log && $._.$.log.debug('CA ' + spec.env.defaultCAId +
                                         ' already created in node ' +
                                         err.remoteNode);
            return [null, that];
        } else {
            return [err];
        }
    }
};
