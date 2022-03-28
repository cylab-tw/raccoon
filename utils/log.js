const fs = require('fs');
const path = require('path');
const { configure, getLogger } = require('log4js');
configure(path.join(__dirname, "../config/log4js.default.json"));
let raccoonLogger = getLogger();

module.exports.logger = raccoonLogger;