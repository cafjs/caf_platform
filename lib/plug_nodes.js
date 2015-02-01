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
"use strict";
/**
 * A plug to manage available nodes so that CAs are unique in the data center.
 *
 * A node is identified by a 'hostname:port' string, where the hostname is
 * a publicly visible address or DNS name.
 *
 * In many cloud deployments, public addresses are NATed to an internal IP
 *  address, and it is more efficient to use internal addresses for
 * communication between co-located services and nodes. For this reason, we add
 * the notion of a private node identifier, that uses an externally non-routable
 *  IP address/port.
 *
 * This plug caches the public to private name bindings for all
 *  nodes, and exposes them using a '$' context.
 *
 * It also self-registers at boot time with a naming service (e.g., redis)
 * using its own local name, obtaining a public name in response. This binding
 * is a lease, and this plug will continously renew this lease
 * while it is still alive. Public IPv4 addresses/external ports are scarce
 * resources that are typically dynamically allocated.
 *
 * Configuration:
 *
 *  {
 *    "name": "nodes",
 *    "module" : "caf_platform#plug_nodes",
 *    "description" : "Manage available nodes",
 *    "env" : {
 *      "nodesService" : "cp",
 *      "leaseTimeout" : 5,
 *      "allPublicNodeIds" : [
 *       {
 *          "hostname" : "foo.com",
 *           "portRange" : [3000, 3500]
 *       },
 *       {
 *          "hostname": "bar.com",
 *          "portRange" : [3000,3000]
 *       }
 *      ]
 *    }
 *  }
 * @name plug_nodes
 * @namespace
 * @augments caf_components/gen_plug
 */

var assert = require('assert');
var events = require('events');
var util = require('util');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var genPlug = caf_comp.gen_plug;

var ChangeEmitter = function() {
    events.EventEmitter.call(this);
};

util.inherits(ChangeEmitter, events.EventEmitter);

ChangeEmitter.prototype.change = function(newVersion) {
    this.emit('change', newVersion);
};

ChangeEmitter.prototype.close = function(reason) {
    this.emit('close', reason);
    this.removeAllListeners();
};

/**
 * Factory method to create a plug to  manage available nodes so that CAs are
 * unique in the data center.
 *
 *  @see  caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {
    try {
        var that = genPlug.constructor($, spec);
        $._.$.log && $._.$.log.debug('New nodes plug');

        assert.equal(typeof spec.env.nodesService, 'string',
                      "'spec.env.nodesService' is not a string");
        var ns = spec.env.nodesService;

        assert.equal(typeof spec.env.leaseTimeout, 'number',
                     "'spec.env.leaseTimeout' is not a number");
        var leaseTimeout = spec.env.leaseTimeout;

        assert.equal(typeof spec.env.stealthNode, 'boolean',
                     "'spec.env.stealthNode' is not a boolean");

        var privateNodeId = $._.$.paas.getAppHost() + ':' +
            $._.$.paas.getAppPort();

        assert.ok(Array.isArray(spec.env.allPublicNodeIds),
                     "'spec.env.allPublicNodeIds' is not an array");
        var expandNodeIds = function() {
            var result = [];
            spec.env.allPublicNodeIds
                .forEach(function(x) {
                             for (var i = x.portRange[0]; i<= x.portRange[1];
                                  i++) {
                                 result.push(x.hostname + ':' + i);
                             }
                         });
            return result;
        };
        var allPublicNodeIds = expandNodeIds();

        var version = 0;

        var changeEmitter = new ChangeEmitter();
        changeEmitter.on('error', function(err) {
                             $._.$.log &&
                                 $._.$.log.error('ChangeEmitter: ' +
                                                 myUtils.errToPrettyStr(err));
                         });
        var nodeId = null;

        /* Public to private bindings of known nodes.*/
        that.$ = {};

        /**
         * Gets a public unique identifier for the current node.js process.
         *
         * Identifiers are of the form 'hostname:port' where 'hostname' is a
         * public IP address or DNS name.
         *
         * @return {string} An identifier for the current node.js process.
         *
         * @name plug_nodes#getNodeId
         * @function
         */
        that.getNodeId = function() {
            return nodeId;
        };

        /**
         * Gets a version number reflecting the state of public to private
         * node bindings.
         *
         * @return {number} A version number for the current node bindings.
         *
         * @name plug_nodes#getVersion
         * @function
         */
        that.getVersion = function() {
            return version;
        };

        /**
         * Gets the public indentifiers of all known nodes.
         *
         * The status of these nodes is in `that.$`
         *
         * @return {Array.<string>} All the public indentifiers of known nodes.
         *
         * @name plug_nodes#getAllPublicNodeIds
         * @function
         */
        that.getAllPublicNodeIds = function() {
            return allPublicNodeIds;
        };


        /**
         * Register for notifications of nodes binding changes.
         *
         * @param {function(number)} clientF A callback to call with a new
         * version number when bindings change.
         * @param {function(string)=} closeF An optional callback when no more
         * notifications will be issued.
         *
         * @name plug_nodes#onChange
         * @function
         */
        that.onChange = function(clientF, closeF) {
            changeEmitter.on('change', function(newVersion) {
                                 clientF(newVersion);
                             });
            if (closeF) {
                changeEmitter.on('close', function(reason) {
                                     closeF(reason);
                                 });
            }
        };


        /**
         * Gets a private unique identifier for the current node.js process.
         *
         * Identifiers are of the form 'hostname:port' where 'hostname' is a
         * private IP address or DNS name.
         *
         * Many cloud deployments NAT a public address to a private one, and
         * performance improves if private addresses are used within the data
         * center.
         *
         * @return {string} A private identifier for the current node.js
         *  process.
         *
         * @name plug_nodes#getPrivateNodeId
         * @function
         */
        that.getPrivateNodeId = function() {
            return privateNodeId;
        };


        /**
         * Renews a lease associated with this node.
         *
         * @param {function(Error)} cb0 A callback with
         * an error if we cannot renew lease.
         *
         */
        var renewNodeLease = function(cb0) {
            if (nodeId) {
                $._.$[ns].renewNodeLease(privateNodeId, leaseTimeout, cb0);
            } else {
                cb0(null);
            }
        };

        var refreshNodes = function(cb0) {
            $._.$[ns].listNodes(allPublicNodeIds, function(err, all) {
                                    if (err) {
                                        cb0(err);
                                    } else {
                                        if (!myUtils.deepEqual(that.$, all)) {
                                            that.$ = all;
                                            version = version + 1;
                                            changeEmitter.change(version);
                                        }
                                        cb0(null);
                                    }
                                });
        };

        /**
         * Entry method for a cron to periodically trigger node lease renewal
         * and refresh of node bindings.
         *
         * @param {caf.cb} cb0 A callback to notify when done.
         *
         * @name plug_nodes#.__ca_pulse__
         * @function
         *
         */
        that.__ca_pulse__ = function(cb0) {
            async.series([
                             renewNodeLease,
                             refreshNodes
                         ], function(err, ignore) {
                             if (err) {
                                 $._.$.log &&
                                     $._.$.log.warn('plug_nodes exception:' +
                                                    myUtils
                                                    .errToPrettyStr(err));
                                 that.__ca_shutdown__(null, cb0);
                             } else {
                                 cb0(null);
                             }
                         });
        };
        if (spec.env.stealthNode) {
            // do not register
            cb(null, that);
        } else {
            $._.$[ns].grabNodeLease(allPublicNodeIds, privateNodeId,
                                    leaseTimeout, function(err, name) {
                                        if (err) {
                                            cb(err);
                                        } else {
                                            nodeId = name;
                                        cb(null, that);
                                        }
                                    });
        }
    } catch (err) {
        cb(err);
    }
};
