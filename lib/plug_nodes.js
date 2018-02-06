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
 * A plug to manage available nodes, i.e., `node.js` processes, that run your
 * application.
 *
 * A node is identified by a `hostname:port` string, where the `hostname` is
 * a publicly visible address or DNS name. The `port` may be used as a network
 * port, or encoded in the actual external address.
 *
 * In many cloud deployments, public addresses are NATed to an internal IP
 * address, and it is more efficient to use internal addresses for
 * communication between co-located services and nodes.
 *
 * For this reason, we add the notion of a private node identifier, that uses
 * a non-externally routable IP address/port.
 *
 * This plug caches the public to private name bindings for all
 * nodes, and exposes them using a `$` context.
 *
 * It also self-registers at boot time with a naming service (e.g., `Redis`),
 * using its own local name, and obtaining a public name in response.
 * This binding is implemented with a lease, and this plug will continously
 * renew it while still alive.
 *
 * Properties:
 *
 *     {stealthMode: boolean, nodesService: string, leaseTimeout: number,
 *      allPublicNodeIds: {publicHostname: string, publicRangeStart: number,
 *                         publicRangeEnd: number} | null}
 *
 * where:
 *
 *  * `stealthMode`: whether this node should not register (mostly for
 * debugging or network proxies).
 *  * `nodesService`: backend service for managing nodes, e.g., `cp`.
 *  * `leaseTimeout`: time in seconds before the node lease expires.
 *  * `allPublicNodeIds`: recipe to enumerate available public identifiers for
 * nodes. In stealth mode it can be `null`.
 *
 * @module caf_platform/plug_nodes
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class

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
    // @ts-ignore: Does not know it is an EventEmitter
    this.emit('change', newVersion);
};

ChangeEmitter.prototype.close = function(reason) {
    // @ts-ignore: Does not know it is an EventEmitter
    this.emit('close', reason);
    // @ts-ignore: Does not know it is an EventEmitter
    this.removeAllListeners();
};

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

        /* We allow in stealth mode to provide a wildcard, i.e., `null`, for
         *  the range of 'allPublicNodeIds'. This simplifies
         *  the configuration of network proxies.
         */
        if (!spec.env.stealthNode) {
            assert.ok(spec.env.allPublicNodeIds &&
                      (typeof spec.env.allPublicNodeIds === 'object'),
                      "'spec.env.allPublicNodeIds' is not an non-null object");
        }

        // TODO: get rid of expansion and do a proper range query
        var expandNodeIds = function() {
            var result = [];
            var hostname = spec.env.allPublicNodeIds.publicHostname ||
                    $._.__ca_getAppFullName__();
            var start = spec.env.allPublicNodeIds.publicRangeStart;
            var end = spec.env.allPublicNodeIds.publicRangeEnd;
            for (var i = start; i<= end; i++) {
                result.push(hostname + ':' + i);
            }
            return result;
        };

        var allPublicNodeIds = (spec.env.allPublicNodeIds ? expandNodeIds() :
                                null);

        var version = 0;

        var changeEmitter = new ChangeEmitter();
        // @ts-ignore: Does not know it is an EventEmitter
        changeEmitter.on('error', function(err) {
            $._.$.log && $._.$.log.error('ChangeEmitter: ' +
                                         myUtils.errToPrettyStr(err));
        });
        var nodeId = null;

        /**
         * Public to private bindings of known nodes.
         *
         * @type {Object.<string, string>}
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias $
         */
        that.$ = {};

        /**
         * Gets a public unique identifier for the current node.js process.
         *
         * Identifiers are of the form `hostname:port` where `hostname` is a
         * public IP address or DNS name.
         *
         * @return {string} An identifier for the current node.js process.
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias getNodeId
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
         * @memberof! module:caf_platform/plug_nodes#
         * @alias getVersion
         */
        that.getVersion = function() {
            return version;
        };

        /**
         * Gets the public indentifiers of all known nodes.
         *
         * The status of these nodes is in `that.$`
         *
         * @return {Array.<string>} All the public identifiers of known nodes.
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias getAllPublicNodeIds
         */
        that.getAllPublicNodeIds = function() {
            return allPublicNodeIds;
        };


        /**
         * Register for notifications of node binding changes.
         *
         * @param {function(number)} clientF A callback of type
         * `function(number)` called when bindings change with a new
         * version number.
         * @param {function(string)=} closeF An optional callback called when
         *  no more notifications will be issued.
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias onChange
         */
        that.onChange = function(clientF, closeF) {
            // @ts-ignore: Does not know it is an EventEmitter
            changeEmitter.on('change', function(newVersion) {
                clientF(newVersion);
            });
            if (closeF) {
                // @ts-ignore: Does not know it is an EventEmitter
                changeEmitter.on('close', function(reason) {
                    closeF(reason);
                });
            }
        };


        /**
         * Gets a private unique identifier for the current `node.js` process.
         *
         * Identifiers are of the form `hostname:port` where `hostname` is a
         * private IP address or DNS name.
         *
         * Many cloud deployments NAT a public address to a private one, and
         * performance improves if private addresses are used within the data
         * center.
         *
         * @return {string} A private identifier for the current `node.js`
         *  process.
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias getPrivateNodeId
         */
        that.getPrivateNodeId = function() {
            return privateNodeId;
        };


        /*
         * Renews a lease associated with this node.
         *
         * @param {function(Error)} cb0 A callback with
         * an error if we cannot renew lease.
         *
         */
        var renewNodeLease = function(cb0) {
            try {
                if (nodeId) {
                    $._.$[ns].renewNodeLease(privateNodeId, leaseTimeout, cb0);
                } else {
                    cb0(null);
                }
            } catch (err) {
                cb0(err);
            }
        };

        var refreshNodes = function(cb0) {
            try {
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
            } catch (err) {
                cb0(err);
            }
        };

        /**
         * Entry method for a cron to periodically trigger node lease renewal,
         * and also refresh node bindings.
         *
         * @param {cbType} cb0 A callback to notify when done.
         *
         * @memberof! module:caf_platform/plug_nodes#
         * @alias __ca_pulse__
         *
         */
        that.__ca_pulse__ = function(cb0) {
            async.series([
                renewNodeLease,
                refreshNodes
            ], function(err) {
                if (err) {
                    $._.$.log && $._.$.log.warn('plug_nodes exception:' +
                                                myUtils.errToPrettyStr(err));
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
