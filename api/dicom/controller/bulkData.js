const mongodb = require("../../../models/mongodb");
const { MultipartWriter } = require('../../../utils/multipartWriter');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @returns 
 */
module.exports = async function (req, res) {
    let key = req.params.objKey;
    let instanceUID = req.params.instanceUID;
    let bulkData = await mongodb["dicomBulkData"].findOne({
        $and: [
            {
                instanceUID: instanceUID
            },
            {
                filename: new RegExp(key , "gi")
            }
        ]
    }).exec();

    let multipartWriter = new MultipartWriter([],res, req);
    await multipartWriter.setHeaderMultipartRelatedContentType("application/octet-stream");
    await multipartWriter.writeBulkData(bulkData);
    await multipartWriter.writeFinalBoundary();
    return res.end();
};