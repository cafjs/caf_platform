
/**
 * @global
 * @typedef {function(Error?, any=):void} cbType
 *
 */


/**
 * @global
 * @typedef {Object} specType
 * @property {string} name
 * @property {string|null} module
 * @property {string=} description
 * @property {Object} env
 * @property {Array.<specType>=} components
 *
 */

/**
 * @global
 * @typedef {Object} specDeltaType
 * @property {string=} name
 * @property {(string|null)=} module
 * @property {string=} description
 * @property {Object=} env
 * @property {Array.<specType>=} components
 *
 */

/**
 * @global
 * @typedef {Object} remoteNodeNonNullType
 * @property {string} remoteNode The current lease owner.
 */

/**
 * @global
 * @typedef {null | remoteNodeNonNullType} remoteNodeType
 */


/**
 * @global
 * @typedef {Object.<string, Object>} ctxType
 */
