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
 * A plug to an external service that maintains leases on CAs.
 *
 * A lease protects a binding between a CA identifier and a location. This
 * binding ensures that CAs are unique across the data center, and therefore,
 * they will properly serialize state changes, and provide a consistent view to
 * the external world.
 *
 * If the node owning the lease crashes, the lease eventually expires.
 * At that point a different, randomly picked, node can create a new lease
 * and restart the CA safely.
 *
 *
 * @module caf_platform/plug_lease
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const caf_comp = require('caf_components');
const genPlug = caf_comp.gen_plug;

exports.newInstance = async function($, spec) {
    try {
        const that = genPlug.create($, spec);
        /* Time in seconds before a new lease expires.*/
        const leaseTimeout = spec.env.leaseTimeout;
        assert.equal(typeof leaseTimeout, 'number',
                     "'spec.env.leaseTimeout' is not a number");
        $._.$.log && $._.$.log.debug('New lease plug');

        /**
         * Gets the duration of a lease in seconds.
         *
         * @return {number} The lease timeout in seconds.
         *
         * @memberof! module:caf_platform/plug_lease#
         * @alias getLeaseTimeout
         */
        that.getLeaseTimeout = function() {
            return leaseTimeout;
        };

        /**
         * Grabs a lease that guarantees exclusive ownership of a CA by this
         *  node.
         *
         * The type of `remoteNodeType` is `{remoteNode:string}|null`.
         *
         * @param {string} id  An identifier for the CA.
         * @param {cbType} cb0 A callback  with optional
         * (error) argument containing the current owner in a
         * `remoteNode:string` error field, if we failed to acquire the lease.
         * Otherwise, the argument is `null`, and we got the lease.
         *
         * @memberof! module:caf_platform/plug_lease#
         * @alias grabLease
         */
        that.grabLease = function(id, cb0) {
            try {
                $._.$.cp.grabLease(id, leaseTimeout, cb0);
            } catch (err) {
                cb0(err);
            }
        };


        /**
         * Renews a list of leases currently owned by this node.
         *
         * @param {Array.<string>} ids A list of identifiers for local CAs.
         * @param {function(Object, Array.<string>=):void} cb0 A callback of
         * type `function(Object, Array.<string>=):void` with either
         * an error (first) argument, or a (second) argument with a list of CA
         * identifiers that we failed to renew.
         *
         * @memberof! module:caf_platform/plug_lease#
         * @alias renewLeases
         */
        that.renewLeases = function(ids, cb0) {
            try {
                if (ids.length === 0) {
                    cb0(null, []);
                } else {
                    $._.$.cp.renewLeases(ids, leaseTimeout, cb0);
                }
            } catch (err) {
                cb0(err);
            }
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
