var m = require('./main');
m.load(null, {name:'top'}, 'framework.json', null, function(err, $) { console.log(err); console.log($);});
