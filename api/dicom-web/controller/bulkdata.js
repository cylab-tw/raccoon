const mongodb = require("../../../models/mongodb");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const uuid = require('uuid');
const fs = require('fs');
const {
    MultipartWriter
} = require('../../../utils/multipartWriter');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @returns 
 */
module.exports = async function (req, res) {
    let {
        studyID,
        seriesID,
        instanceID
    } = req.params;
    let bulkDataList = await mongodb["dicomBulkData"].find({
        $and: [
            {
                $or : [
                    {
                        studyUID: studyID
                    },
                    {
                        seriesUID: seriesID
                    },
                    {
                        instanceUID: instanceID
                    }
                ]
                
            }
        ]
    })
    .exec();

    let multipartWriter = new MultipartWriter([], res, req);
    multipartWriter.setHeaderMultipartRelatedContentType("application/octet-stream");
    let isFirst = true;
    for (let bulkData of bulkDataList) {
        await multipartWriter.writeBulkData(bulkData, isFirst);
        isFirst = false;
    }
    await multipartWriter.writeFinalBoundary();
    
    return res.end();
};