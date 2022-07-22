const mongodb = require("../../../models/mongodb");
const mongoFunc = require("../../../models/mongodb/func");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const dicomWebHandleError = require("../../../models/DICOMWeb/httpMessage");
const { MultipartWriter } = require("../../../utils/multipartWriter"); // eslint-disable-line @typescript-eslint/naming-convention

let multipartFunc = {};
multipartFunc["image/jpeg"] = {
    getInstance: async function (iParam, req, res, type, frameList) {
        return new Promise(async (resolve) => {
            let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
            if (imagesPath) {
                let maxFrameNumber = _.max(frameList);
                let minFrameNumber = _.min(frameList);
                if (minFrameNumber <= 0) {
                    dicomWebHandleError.sendBadRequestMessage(
                        res,
                        `Invalid frame number ,The number must be positive and greater than zero , The number must >=0 , But request ${minFrameNumber}`
                    );
                    return resolve(false);
                }
                let dicomJson = await mongodb.ImagingStudy.findOne(
                    {
                        $and: [
                            {
                                "dicomJson.0020000D.Value": req.params.studyID
                            },
                            {
                                "series.uid": req.params.seriesID
                            },
                            {
                                "series.instance.uid": req.params.instanceID
                            }
                        ]
                    },
                    {
                        "dicomJson.0020000D": 1,
                        "series.uid": 1,
                        "series.instance.uid": 1,
                        "series.instance.dicomJson.00280008": 1
                    }
                );
                let dataSeries = dicomJson.series;
                let hitSeries = _.find(dataSeries, "uid", req.params.seriesID);
                let hitSeriesInstance = hitSeries.instance;
                let hitInstance = _.find(hitSeriesInstance, {
                    uid: req.params.instanceID
                });
                let dicomNumberOfFrames =
                    _.get(hitInstance, "00280008.Value.0") || 1;
                dicomNumberOfFrames = parseInt(dicomNumberOfFrames);
                if (maxFrameNumber > dicomNumberOfFrames) {
                    dicomWebHandleError.sendBadRequestMessage(
                        res,
                        `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${maxFrameNumber}`
                    );
                    return resolve(false);
                }
                let multipartWriter = new MultipartWriter(imagesPath, res, req);
                await multipartWriter.writeFrames(type, frameList);
                return resolve(true);
            }
            dicomWebHandleError.sendNotFoundMessage(req, res);
            return resolve(false);
        });
    }
};
module.exports = async function (req, res) {
    let type = "";
    try {
        type = req.headers.accept
            .match(/type=(.*)/gi)[0]
            .split(/[,;]/)[0]
            .substring(5)
            .replace(/"/g, "");
    } catch (e) {
        return dicomWebHandleError.sendBadRequestMessage(
            res,
            `Bad headers : accept
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`
        );
    }
    let headersAccept = _.get(req.headers, "accept", "");
    if (headersAccept.includes("image/jpeg")) {
        let frameNumbers = req.params.frameList
            .split(",")
            .map((v) => parseInt(v));
        if (!checkIsAllNumber(frameNumbers)) {
            return dicomWebHandleError.sendBadRequestMessage(
                res,
                `${frameNumbers} MUST be number`
            );
        }
        try {
            let resWriteStatus = await multipartFunc["image/jpeg"]["getInstance"](
                req.params,
                req,
                res,
                type,
                frameNumbers
            );
            if (resWriteStatus) {
                res.end();
                return;
            } else {
                return;
            }
        } catch (e) {
            return dicomWebHandleError.sendBadRequestMessage(
                res,
                `This WADO-RS with frame cannot generate the following content type with Accept Header: ${_.get(
                    req,
                    "headers.accept"
                )} 
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`
            );
        }
    }
    return dicomWebHandleError.sendBadRequestMessage(
        res,
        `This WADO-RS with frame cannot generate the following content type with Accept Header: ${_.get(
            req,
            "headers.accept"
        )} 
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`
    );
};

function checkIsAllNumber(frameNumber) {
    let isAllNumber = frameNumber.every(_.isNumber);
    return isAllNumber;
}
