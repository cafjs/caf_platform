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
 * A plug to an external service to maintain leases on CAs.
 *
 * A lease protects a binding between a CA id and a location. This
 * binding ensures that  CAs are unique across the data center, and therefore,
 * they will properly serialize state changes and provide a consistent view to
 * the external world.
 *
 * If the node owning the lease crashes, the lease eventually expires.
 * At that point a different, randomly picked,  node can create a new lease
 * and restart the CA safely.
 *
 *
 * @name plug_lease
 * @namespace
 * @augments  caf_components/gen_plug
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var genPlug = caf_comp.gen_plug;


/**
 * Factory method to create a lease plugin.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlug.constructor($, spec);
        /* Time in seconds before a new lease expires.*/
        var leaseTimeout = spec.env.leaseTimeout;
        assert.equal(typeof leaseTimeout, 'number',
                     "'spec.env.leaseTimeout' is not a number");
        $._.$.log && $._.$.log.debug('New lease plug');

        /**
         * Gets the timeout duration of a lease in seconds.
         *
         * @return {number} The lease timeout duration in seconds.
         */
        that.getLeaseTimeout = function() {
            return leaseTimeout;
        };

        /**
         * Grabs a lease that guarantees exclusive ownership of a CA by this
         *  node.
         *
         * @param {string} id  An identifier for the CA.
         * @param {function({remoteNode:string})} cb0 A callback with optional
         * (error) argument containing the current owner if we fail to acquire
         * the lease. Falsy error argument if we got it.
         *
         * @name plug_lease#grabLease
         * @function
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
         * @param {function(Object, Array.<string>)} cb0 A callback with either
         * an error (first) argument or a (second) argument with a list of CA
         *  Ids that we failed to renew.
         *
         * @name plug_lease#renewLeases
         * @function
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

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
