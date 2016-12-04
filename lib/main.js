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
 * Main package module.
 *
 * @module caf_platform/main
 *
 */

/* eslint-disable max-len */
/**
 * @external caf_components/gen_plug
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_plug.html}
 */

/**
 * @external caf_components/gen_container
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_container.html}
 */
/**
 * @external caf_components/gen_dynamic_container
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_dynamic_container.html}
 */

/**
 * @external caf_components/gen_supervisor
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_supervisor.html}
 */

/**
 * @external caf_components/gen_cron
 * @see {@link https://cafjs.github.io/api/caf_components/module-caf_components_gen_cron.html}
 */

/**
 * @external caf_ca
 * @see {@link https://cafjs.github.io/api/caf_ca/index.html}
 */

/**
 * @external caf_cli
 * @see {@link https://cafjs.github.io/api/caf_cli/index.html}
 */

/* eslint-enable max-len */

exports.platform_main = require('./platform_main');

exports.plug_nodes = require('./plug_nodes');
exports.plug_paas = require('./plug_paas');
exports.cron_nodes = require('./cron_nodes');
exports.gen_pipe = require('./gen_pipe');

// For convenience...

exports.caf_transport = require('caf_transport');
var caf_components = exports.caf_components = require('caf_components');
exports.async = caf_components.async;
exports.caf_security = require('caf_security');
exports.caf_redis = require('caf_redis');
exports.caf_sharing = require('caf_sharing');
exports.caf_pubsub = require('caf_pubsub');


// module
exports.getModule = function() {
    return module;
};
