/**
 * @typedef UidObj
 * @property {string} studyUID
 * @property {string} seriesUID
 * @property {string} instanceUID
 * @property {string} sopClass
 */

/**
 * @typedef RetrieveUrlObj
 * @property {string} studyRetrieveUrl
 * @property {string} seriesRetrieveUrl
 * @property {string} instanceRetrieveUrl
 */

/**
 * @typedef StoreInstanceResult
 * @property {boolean} isFailure
 * @property {number} statusCode
 * @property {string} message
 * @property {UidObj} uidObj
 * @property {RetrieveUrlObj} retrieveUrlObj
 * @property {number} httpStatusCode
 */

module.exports.unUse = {};