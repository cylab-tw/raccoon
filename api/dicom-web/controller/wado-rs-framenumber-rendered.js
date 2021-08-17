const { sendBadRequestMessage } = require('../../../models/DICOMWeb/httpMessage');
const { getFrameImage } = require('../../../models/dcmtk');
const mongoFunc = require('../../../models/mongodb/func');
const mongodb = require('../../../models/mongodb');
const _ = require("lodash");
const sharp = require('sharp');
const path = require('path');
const Magick = require('../../../models/magick');
const fs = require('fs');
const { exec } = require('child_process');
const iconv = require('iconv-lite');
const uuid = require('uuid');

async function getInstance (iParam) {
    return new Promise (async (resolve)=> {
        let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
        if (imagesPath) {
            return resolve({
                status : true , 
                path : imagesPath[0]
            });    
        }
        return resolve({
            status : false
        });
    });
}

/**
 * 
 * @param {*} param The req.query
 * @param {Magick} magick
 */
function handleImageQuality(param, magick) {
    if (param.quality) {
        // imageSharp = imageSharp.jpeg({
        //     quality: param.quality
        // });
        magick.quality(param.quality);
    }
}

/**
 *
 * @param {*} param The req.query
 * @param {Magick} magick
 * @param {string} instanceID
 */
async function handleImageICCProfile(param, magick, instanceID) {
    let iccProfileAction = {
        "no" : async ()=> {},
        "yes": async ()=> {
            let iccProfileBinaryFile = await mongodb.dicomBulkData.findOne({
                $and: [
                    {
                        binaryValuePath: "00480105.Value.0.00282000.InlineBinary"
                    },
                    {
                        instanceUID: instanceID
                    }
                ]
            });
            if(!iccProfileBinaryFile) throw new Error("The Image dose not have icc profile tag");
            let iccProfileSrc = path.join(process.env.DICOM_STORE_ROOTPATH, iccProfileBinaryFile.filename);
            let dest = path.join(process.env.DICOM_STORE_ROOTPATH, iccProfileBinaryFile.filename + `.icc`);
            if (!fs.existsSync(dest)) fs.copyFileSync(iccProfileSrc, dest)
            await magick.iccProfile(dest);
        },
        "srgb": async ()=> {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/sRGB.icc"));
        },
        "adobergb": async () => {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/adobeRGB.icc"));
        },
        "rommrgb": async ()=> {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/rommRGB.icc"));
        },
    }
    try {
        if (param.iccprofile) {
            await iccProfileAction[param.iccprofile]();
        }
    } catch(e) {
        console.error("set icc profile error:" , e);
        throw e;
    }
    
}


/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @returns 
 */
module.exports = async function (req , res) {
    try {
        let headerAccept = req.headers.accept;
        if (_.isUndefined(headerAccept)) {
            return sendBadRequestMessage(res, `header accept only allow */* or image/jpeg , exception : ${headerAccept}`);
        }
        if (!headerAccept.includes("*/*") && !headerAccept.includes("image/jpeg")) {
            return sendBadRequestMessage(res, `header accept only allow */* or image/jpeg , exception : ${headerAccept}`);
        }
        let getInstanceStatus = await getInstance(req.params);
        if (getInstanceStatus.status) {
            let imagePath = getInstanceStatus.path;
            let dicomJson = await mongodb.ImagingStudy.findOne({
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
            }, {
                "dicomJson.0020000D": 1,
                "series.uid": 1,
                "series.instance.uid": 1,
                "series.instance.dicomJson.00280008": 1
            });
            let dataSeries = dicomJson.series;
            let hitSeries = _.find(dataSeries, "uid", req.params.seriesID);
            let hitSeriesInstance = hitSeries.instance;
            let hitInstance = _.find(hitSeriesInstance, { uid: req.params.instanceID });
            let dicomNumberOfFrames = _.get(hitInstance, "dicomJson.00280008.Value.0") || 1;
            dicomNumberOfFrames = parseInt(dicomNumberOfFrames);
            if (req.params.frameNumber > dicomNumberOfFrames) {
                return sendBadRequestMessage(res, `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${req.params.frameNumber}`);
            }
            console.time("get frame image");
            let getFrameImageStatus = await getFrameImage(imagePath, req.params.frameNumber);
            console.timeEnd("get frame image");
            if (getFrameImageStatus.status) {
                //let imageStream = getFrameImageStatus.imageStream;
                let imagePath = getFrameImageStatus.imagePath;
                let magick = new Magick(imagePath);
                //await imageSharp.toFile("test.jpg");
                await handleImageQuality(req.query, magick);
                await handleImageICCProfile(req.query, magick, req.params.instanceID);
                console.log(magick.magickCommand);
                console.time("do magick");
                await magick.execCommand();
                console.timeEnd("do magick")
                res.set("content-type", "image/jpeg");
                //return imageStream.pipe(res);

                //return res.end(await imageSharp.toBuffer(), 'binary');
                return res.end(magick.toBuffer(), 'binary');
            }
            return sendBadRequestMessage(res, `Can not get instance frame image`);
        }
    } catch(e) {
        console.error(e);
    }
}
