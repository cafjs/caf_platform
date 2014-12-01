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
 * A plug to access properties of external services managed by a PaaS, such as
 *  Cloud Foundry.
 *
 * Example of configuration data (in framework.json) to
 * debug CAF in local mode (i.e., without using Cloud Foundry).
 *
 *          {
 *            "module": "plug_paas",
 *            "name": "cf",
 *            "env": {
 *                "paas" : "cloudfoundry",
 *                "port" : "process.env.VCAP_APP_PORT||3000",
 *                "host" : "process.env.VCAP_APP_HOST||localhost",
 *                "home": "process.env.HOME||/tmp",
 *
 *                "redis" : {
 *                    "port" : 6379,
 *                    "hostname" : "localhost",
 *                    "password" : "pleasechange"
 *                }
 *            }
 *          }
 *
 *
 * @name plug_paas
 * @namespace
 * @augments caf_components/gen_plug
 */
var assert = require('assert');
var caf_comp = require('caf_components');
var genPlug = caf_comp.gen_plug;


/**
 * Factory method to create a PaaS plugin.
 *
 * @see caf_components/supervisor
 */
exports.newInstance = function($, spec, cb) {

    try {
        assert.equal(typeof spec.env.port, 'number',
                     "'spec.env.port' is not a number");
        assert.equal(typeof spec.env.paas, 'string',
                     "'spec.env.paas' is not a string");
        assert.equal(typeof spec.env.home, 'string',
                     "'spec.env.home' is not a string");
        assert.equal(typeof spec.env.host, 'string',
                     "'spec.env.host' is not a string");

        var that = genPlug.constructor($, spec);

        $._.$.log && $._.$.log.debug('New PaaS plug');

        /**
         * Gets the port is listening to.
         *
         * @return {number} The application port number.
         *
         * @name plug_paas#getAppPort
         * @function
         *
         */
        that.getAppPort = function() {
            return spec.env.port;
        };

        /**
         * Gets the local host name.
         *
         * @return {string} The local host name.
         *
         * @name plug_paas#getAppHost
         * @function
         *
         */
        that.getAppHost = function() {
            return spec.env.host;
        };

        /**
         * Gets the home directory.
         *
         * @return {string} The home directory.
         *
         * @name plug_paas#getHome
         * @function
         *
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
        var getCFServiceConfig = function(typePrefix, name) {
            var vcapServices = (typeof process.env.VCAP_SERVICES === 'string' ?
                                JSON.parse(process.env.VCAP_SERVICES) : {});
            var matchType = new RegExp('^' + typePrefix);
            for (var type in vcapServices) {
                if (matchType.test(type)) {
                    var svcDef = vcapServices[type];
                    if (Array.isArray(svcDef)) {
                        if (name) {
                            for (var svc in svcDef) {
                                var val = svcDef[svc];
                                if ((typeof val === 'object') &&
                                    (val.name === name)) {
                                    return val.credentials;
                                }
                            }
                        } else {
                            var service = svcDef[0];
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
         * wanted, e.g., 'redis'.
         * @param {string=} name A specific name for the service or undefined.
         * @return {caf.service} Configuration data for a remote service.
         *
         * @name plug_paas#getServiceConfig
         * @function
         *
         */
        that.getServiceConfig = function(typePrefix, name) {

            var result = null;
            if (spec.env.paas === 'cloudfoundry') {
                result = getCFServiceConfig(typePrefix, name);
            }
            /* format example for spec.env:
             *  {'redis' : { password: <string>,
             *               hostname: <string>,
             *               port: <integer>}} */
            return (result ? result : spec.env[typePrefix]);
        };

        cb(null, that);
    } catch (err) {
        cb(err);
    }
};
