/*!
Copyright 2020 Caf.js Labs and contributors

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
 * Processing pipeline for enabling CDN.
 *
 * Properties:
 *
 *      {appCDN: string=, appLocalName: string=, appSubdirCDN: string=}
 *
 * where:
 *
 * * `appCDN`: a url prefix for your CDN, or `undefined` or '' to replace by an
 * empty string.
 * `appLocalName`: the local name of the app. If `appCDN` is not a falsy,
 * it should not be a falsy.
 * `appSubdirCDN`: an optional sub directory to cache invalidate a CDN.
 *
 * When `appCDN` is `https://cdn-2332.kxcdn.com`, `appLocalName` is `myApp`,
 * and `appSubdirCDN` is `v1.01` occurrences in html and js files of
 *`json_rpc.CDN` are replaced by `https://cdn-2332.kxcdn.com/myApp/v1.01`
 *
 * @module caf_platform/pipe_cdn
 * @augments module:caf_platform/gen_pipe
 */
// @ts-ignore: augments not attached to a class
const assert = require('assert');
const gen_pipe = require('./gen_pipe');
const {stringReplace} = require('string-replace-middleware');
const json_rpc = require('caf_transport').json_rpc;
const url = require('url');

exports.newInstance = async function($, spec) {
    try {
        spec.env.appCDN &&
            assert.equal(typeof spec.env.appCDN, 'string',
                         "'spec.env.appCDN' is not a string");
        const appCDN = spec.env.appCDN || '';

        spec.env.appLocalName &&
            assert.equal(typeof spec.env.appLocalName, 'string',
                         "'spec.env.appLocalName' is not a string");
        const appLocalName = spec.env.appLocalName || '';
        if (appCDN && !appLocalName) {
            throw new Error("CDN needs non-falsy 'spec.env.appLocalName'");
        }

        spec.env.appSubdirCDN &&
                assert.equal(typeof spec.env.appSubdirCDN, 'string',
                             "'spec.env.appSubdirCDN' is not a string");
        const appSubdirCDN = spec.env.appSubdirCDN || '';
        if (appCDN && !appSubdirCDN) {
            throw new Error("CDN needs non-falsy 'spec.env.appSubdirCDN'");
        }

        const that = gen_pipe.create($, spec);

        $._.$.log && $._.$.log.debug('New CDN pipe');

        const removeSubdirCDN = function(req) {
            const reqURL = url.parse(req.url);
            const pathSplit = reqURL.pathname.split('/');
            if ((pathSplit.length >= 3) &&
                (pathSplit[0] === '') &&
                (pathSplit[1] === appLocalName) &&
                (pathSplit[2] === appSubdirCDN)) {
                pathSplit.shift();
                pathSplit.shift();
                pathSplit.shift();
                pathSplit.unshift('');
                reqURL.pathname = pathSplit.join('/');
                req.url = url.format(reqURL);
            }
        };

        that.__ca_connectSetup__ = function(app) {
            const replacePath = appCDN ?
                appCDN + '/' + appLocalName + '/' + appSubdirCDN :
                '';
            const options = {
                contentTypeFilterRegexp:
                    /^text\/|^application\/json$|^application\/javascript/
            };
            const cdnKey = {};
            cdnKey[json_rpc.CDN] = replacePath;
            // Cannot figure out cdnKey is 'Record<string, string>'
            // @ts-ignore
            const replace = stringReplace(cdnKey, options);

            app.use(spec.env.path, function(req, res, next) {
                //backwards compatibility
                res.get = function(field){
                    return this.getHeader(field);
                };

                removeSubdirCDN(req);
                replace(req, res, next);
            });
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
