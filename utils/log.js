const fs = require('fs');
const path = require('path');
const { fileExistsSync } = require("./fileExist");
const { configure, getLogger } = require('log4js');
const USER_LOG_CONFIG_FILENAME = path.join(__dirname, "../config/log4js.json");
const DEFAULT_LOG_CONFIG_FILENAME = path.join(__dirname, "../config/log4js.default.json");
if (fileExistsSync(USER_LOG_CONFIG_FILENAME)) {
    configure(USER_LOG_CONFIG_FILENAME);
} else {
    configure(DEFAULT_LOG_CONFIG_FILENAME);
}
let raccoonLogger = getLogger();

module.exports.logger = raccoonLogger;