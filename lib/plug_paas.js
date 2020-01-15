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
 * A plug to access properties of external services managed by a PaaS, such as
 *  Kubernetes, Marathon or Cloud Foundry.
 *
 *  Properties:
 *
 *      {paas: string, port: number, internalPort: number, host: string,
 *       home:string, redis: {port: number, hostname: string, password: string}
 *      }
 *
 *  where:
 *
 * * `paas`: name of the PaaS, e.g., "cloudfoundry", "marathon" or "kubernetes".
 * * `port`: the external port number for this platform.
 * * `internalPort`: the internal, i.e.,  inside container, port.
 * * `host`: the hostname. Under "kubernetes" the value "localhost" is
 *  replaced by the container IP address.
 * * `home` : the home directory.
 * * `redis`: an example of the configuration of a service.
 *
 * @module caf_platform/plug_paas
 * @augments external:caf_components/gen_plug
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const os = require('os');
const ifaces = os.networkInterfaces();
const caf_comp = require('caf_components');
const genPlug = caf_comp.gen_plug;

const BYPASS_DEFAULT = 'default';
const BYPASS_PORT = -1;

const getIPAddress = function() {
    var result = null;
    Object.keys(ifaces).some(function(x) {
        const oneInterface = ifaces[x];
        return oneInterface.some(function(ip) {
            if ((ip.family === 'IPv4') && (!ip.internal)) {
                result = ip.address;
                return true;
            } else {
                return false;
            }
        });
    });
    return result;
};

exports.newInstance = async function($, spec) {
    try {
        assert.equal(typeof spec.env.port, 'number',
                     "'spec.env.port' is not a number");
        assert.equal(typeof spec.env.internalPort, 'number',
                     "'spec.env.port' is not a number");
        assert.equal(typeof spec.env.paas, 'string',
                     "'spec.env.paas' is not a string");
        assert.equal(typeof spec.env.home, 'string',
                     "'spec.env.home' is not a string");
        assert.equal(typeof spec.env.host, 'string',
                     "'spec.env.host' is not a string");

        const host = ((spec.env.host === 'localhost') &&
                (spec.env.paas === 'kubernetes')) ?
            getIPAddress() :
            spec.env.host;

        if (!host) {
            throw new Error('Cannot find IP address for container');
        }

        const that = genPlug.constructor($, spec);

        $._.$.log && $._.$.log.debug('New PaaS plug');

        /**
         * Gets the name of the PaaS used for deployment, e.g.,
         * "cloudfoundry", "marathon" or "kubernetes".
         *
         * @return {string} The name of the PaaS.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getPaaS
         */
        that.getPaaS = function() {
            return spec.env.paas;
        };

        /**
         * Gets the external port is listening to.
         *
         * @return {number} The external application port number.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getAppPort
         */
        that.getAppPort = function() {
            return spec.env.port;
        };

        /**
         * Gets the internal port the app is listening to.
         *
         * The internal port can be different from the external one when using
         *  Docker containers.
         *
         * A value of `-1` just means use the external port.
         *
         * @return {number} The application internal port number.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getAppInternalPort
         */
        that.getAppInternalPort = function() {
            return spec.env.internalPort === BYPASS_PORT ?
                that.getAppPort() :
                spec.env.internalPort;
        };

        /**
         * Gets the local host name.
         *
         * @return {string} The local host name.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getAppHost
         */
        that.getAppHost = function() {
            return host;
        };

        /**
         * Gets the home directory.
         *
         * @return {string} The home directory.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getHome
         */
        that.getHome = function() {
            return spec.env.home;
        };

        /*
         *  format example for vcapServices:
         *
         *  {'redis-<version>' : [ {'name' : <string>,
         *                          'credentials' : { 'hostname': <string>,
         *                                             'port': <number> ,
         *                                             'password' : <string>,...
         *                                          },...
         *                          }
         *                        ]}
         *
         */
        const getCFServiceConfig = function(typePrefix, name) {
            const vcapServices = typeof process.env.VCAP_SERVICES === 'string' ?
                JSON.parse(process.env.VCAP_SERVICES) :
                {};
            const matchType = new RegExp('^' + typePrefix);
            for (const type in vcapServices) {
                if (matchType.test(type)) {
                    const svcDef = vcapServices[type];
                    if (Array.isArray(svcDef)) {
                        if (name) {
                            for (const svc in svcDef) {
                                const val = svcDef[svc];
                                if ((typeof val === 'object') &&
                                    (val.name === name)) {
                                    return val.credentials;
                                }
                            }
                        } else {
                            const service = svcDef[0];
                            if (typeof service === 'object') {
                                return service.credentials;
                            }
                        }
                    }
                }
            }
            return undefined;
        };


        /**
         * Gets configuration data for a remote service.
         *
         * @param {string} typePrefix A prefix for the type of service
         * wanted, e.g., `redis`.
         * @param {string=} name A specific name for the service or undefined.
         * @return {Object} Configuration data for a remote service.
         *
         * @memberof! module:caf_platform/plug_paas#
         * @alias getServiceConfig
         */
        that.getServiceConfig = function(typePrefix, name) {
            const filterDefaults = function(x) {
                if (x && typeof(x) === 'object') {
                    const result = {};
                    Object.keys(x).forEach(function(key) {
                        if ((x[key] !== BYPASS_DEFAULT) &&
                            (x[key] !== BYPASS_PORT)) {
                            result[key] = x[key];
                        }
                    });
                    return result;
                } else {
                    return x;
                }
            };

            let result = spec.env[typePrefix] || null;
            if (spec.env.paas === 'cloudfoundry') {
                result = getCFServiceConfig(typePrefix, name);
            }
            if (spec.env.paas === 'kubernetes') {
                // TODO: link to kubernetes service discovery
                const msg = 'Ignoring service configuration under Kubernetes';
                $._.$.log && $._.$.log.warn(msg);
                result = null;
            }
            /* format example for spec.env:
             *  {'redis' : { password: <string>,
             *               hostname: <string>,
             *               port: <integer>}} */
            return filterDefaults(result);
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
