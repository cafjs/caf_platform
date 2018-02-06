/*!
Copyright 2014 Hewlett-Packard Development Company, L.P.

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
 * A registry for local CAs.
 *
 * @module caf_platform/plug_registry
 * @augments external:caf_components/gen_dynamic_container
 */
// @ts-ignore: augments not attached to a class
var assert = require('assert');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var genDynamicContainer = caf_comp.gen_dynamic_container;

exports.newInstance = function($, spec, cb) {
    try {
        assert.equal(typeof(spec.env.__ca_json__), 'string',
                     "'spec.env.__ca_json__' is not a string");

        var that = genDynamicContainer.constructor($, spec);

        var super__ca_instanceChild__ = myUtils
            .superior(that, '__ca_instanceChild__');

        /**
         *  Creates a CA or finds a reference to an existing local one
         * given the CA's id.
         *
         * If there is already a remote CA with the same id, it returns an
         * error object in the callback with the remote hosting node (in field
         * `remoteNode` see {@link module:caf_platform/plug_lease#grabLease}.
         *
         * @param {Object=} data An optional hint on how to add the child.
         * @param {Object} specEnv An extra child description to override a
         * default one. At a minimum `specEnv.name` should define the name
         * for this CA.
         * @param {cbType} cb0 A callback to return an error if I cannot
         * create the CA.
         *
         * @memberof! module:caf_platform/plug_registry#
         * @alias __ca_instanceChild__
         */
        that.__ca_instanceChild__ = function(data, specEnv, cb0) {
            try {
                assert.equal(typeof(specEnv.name), 'string',
                     "'specEnv.name' is not a string");
                var desc = $._.$.loader
                    .__ca_loadDescription__(spec.env.__ca_json__, true,
                                            specEnv);
                super__ca_instanceChild__(data, desc, cb0);
            } catch (err) {
                cb0(err);
            }
        };


        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
