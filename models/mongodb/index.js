const path = require('path');
const appDir = path.dirname(require.main.filename);
if (!process.env.MONGODB_HOSTS) {
  require('dotenv').config({
    path: `${appDir}/.env`
  });
}
const dicom_dataDB = require('../mongodb/connector')(process.env);
module.exports = exports = dicom_dataDB;