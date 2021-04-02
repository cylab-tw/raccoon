const mongodb = require("../../../models/mongodb");
const _ = require('lodash');
const uuid = require('uuid');


module.exports = async function (req , res) {
    let key = req.params.objKey;
    let instanceUID = req.params.instanceUID;
    let meatadata = await mongodb.dicomMetadata.findOne({
        instanceUID : instanceUID
    });
    let bulkData = _.get(meatadata._doc , key);

    const BOUNDARY = `${uuid.v4()}-${uuid.v4()}`;
    res.write(`--${BOUNDARY}\r\n`);
    res.write(`Content-Type:multipart/related; type=application/octet-stream; boundary=${BOUNDARY}\r\n`);
    res.write('Content-length: ' + bulkData.length + '\r\n\r\n');
    res.write(bulkData);
    res.write(`\r\n--${BOUNDARY}--`);
    return res.end();
}