var caf_comp = require('caf_components');
var caf_platform = require('../../index');

exports.load = function($, spec, name, modules, cb) {
    modules = modules || [];
    modules.push(module);
    modules.push(caf_platform.getModule());

    caf_comp.load($, spec, name, modules, cb);
};

