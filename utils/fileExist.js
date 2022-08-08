const { promises, statSync, Stats } = require("fs");

/**
 * @typedef Error
 * @property {string} code
 */

/**
 * @typedef Options
 * @property {boolean} includeDirectories
 */


/**
 * 
 * @param {Error} e 
 * @returns 
 */
function handleError(e) {
    if (e.code === "ENOENT") {
        return false;
    } else {
        return undefined;
    }
}

/**
 * 
 * @param {Stats} result 
 * @param {Options} options 
 * @returns 
 */
function handleResult(result, options) {
    return (
        result.isFile() ||
        Boolean(options?.includeDirectories && result.isDirectory())
    );
}

/**
 * asynchronous function for checking file is exists
 * @param {string} path 
 * @param {Options} options 
 * @returns {boolean}
 */
async function fileExists(
    path,
    options = {}
) {
    return promises
        .stat(path)
        .then((result) => {
            return handleResult(result, options);
        })
        .catch((e) => {
            return handleError(e);
        });
}

/**
 * synchronous function for checking file is exists
 * @param {string} path 
 * @param {Options} options 
 * @returns {boolean}
 */
function fileExistsSync(
    path,
    options
) {
    try {
        const result = statSync(path);
        return handleResult(result, options);
    } catch (e) {
        return handleError(e);
    }
}

module.exports.fileExists = fileExists;
module.exports.fileExistsSync = fileExistsSync;
