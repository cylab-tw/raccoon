const mongodb = require("../../../models/mongodb");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const uuid = require('uuid');
const fs = require('fs');
const path = require("path");

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @returns 
 */
module.exports = async function (req , res) {
    let key = req.params.objKey;
    let studyUID = req.params.studyUID;
    let seriesUID = req.params.seriesUID;
    let instanceUID = req.params.instanceUID;
    let metadata = await mongodb["dicomBulkData"].findOne({
        $and: [
            {
                studyUID: studyUID
            },
            {
                seriesUID: seriesUID
            },
            {
                instanceUID: instanceUID
            },
            {
                filename: new RegExp(key , "gi")
            }
        ]
    });

    let metadataAbsFilename = path.join(process.env.DICOM_STORE_ROOTPATH, metadata._doc.filename);

    let bulkData = fs.readFileSync(metadataAbsFilename);

    const BOUNDARY = `${uuid.v4()}-${uuid.v4()}`;
    res.set("Content-Type" , `multipart/related; type=application/octet-stream; boundary=${BOUNDARY}`);
    res.write(`--${BOUNDARY}\r\n`);
    res.write(`Content-Type:multipart/related; type=application/octet-stream; boundary=${BOUNDARY}\r\n`);
    res.write('Content-length: ' + bulkData.length + '\r\n\r\n');
    res.write(bulkData);
    res.write(`\r\n--${BOUNDARY}--`);
    return res.end();
};