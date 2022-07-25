const mongodb = require("../../../models/mongodb");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const uuid = require('uuid');
const fs = require('fs');
const moment = require('moment');

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
module.exports = async (req, res) => {
    try {
        let queryParameter = _.cloneDeep(req.query);
        let paginationSkip = queryParameter['offset'] == undefined ? 0 : queryParameter['offset'];
        let paginationLimit = queryParameter['limit'] == undefined ? 10 : queryParameter['limit'];
        delete queryParameter["offset"];
        delete queryParameter["limit"];
        let dicomToJpegTaskList = await mongodb['dicomToJpegTask']
            .find(
                queryParameter , 
                {
                    _id : 0
                }
            )
            .limit(paginationLimit)
            .skip(paginationSkip)
            .sort({ 
                studyUID: 1,
                taskTime: 1,
                _id: 1
            })
            .exec();
        let dicomToJpegTaskCount = await mongodb['dicomToJpegTask']
            .countDocuments(queryParameter);
        for (let index in dicomToJpegTaskList) {
            let item = dicomToJpegTaskList[index]._doc;
            item.diffTime = undefined;
            item.taskTime = moment(item.taskTime).format("YYYY-MM-DD HH:mm:ss");
            item.finishedTime = moment(item.finishedTime).format("YYYY-MM-DD HH:mm:ss");
            if (item.status) {
                item.diffTime = (moment(item.finishedTime).diff(moment(item.taskTime), "minute", true)).toFixed(2);
            }
        }
        return res.send({
            data: dicomToJpegTaskList,
            count: dicomToJpegTaskCount
        });
    } catch (e) {
        console.error(e);
        return res.send(e);
    }
};