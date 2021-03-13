const mongoFunc = require('../../../models/mongodb/func');
const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const path= require('path');
const uuid = require('uuid');
const _ = require('lodash');
const dicomParser = require('dicom-parser');
const DICOMWebHandleError = require('../../../models/DICOMWeb/httpMessage');
const { writeframesMultipart} = require('../../../models/DICOMWeb')

let multipartFunc = {};
multipartFunc["image/jpeg"] = {
    getInstance:  async function (iParam ,req, res , type , frameList) {
        return new Promise (async (resolve)=> {
            let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
            if (imagesPath) {
                let maxFrameNumber = _.max(frameList);
                let minFrameNumber = _.min(frameList);
                if (minFrameNumber <= 0) {
                    DICOMWebHandleError.sendBadRequestMessage(res , `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${minFrameNumber}`);
                    return resolve(false);
                }
                let dicomFile = fs.readFileSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[0]}`);
                let dicomDataset = dicomParser.parseDicom(dicomFile);
                let dicomNumberOfFrames = dicomDataset.intString("x00280008") || 1;
                dicomNumberOfFrames = parseInt(dicomNumberOfFrames);
                if (maxFrameNumber > dicomNumberOfFrames) {
                    DICOMWebHandleError.sendBadRequestMessage(res , `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${maxFrameNumber}`);
                    return resolve(false);
                }
                await writeframesMultipart(req , res , imagesPath , type , frameList)
                return resolve(true);    
            }
            DICOMWebHandleError.sendNotFoundMessage(req , res);
            return resolve(false);
        });
    }
}
module.exports = async function (req , res) {
    let type = "";
    try {
        type = req.headers.accept.match(/type=(.*)/gi)[0].split(/[,;]/)[0].substring(5).replace(/"/g  ,"");
    } catch (e) {
        return DICOMWebHandleError.sendBadRequestMessage(res , `Bad headers : accept
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`);
    }
    let frameNumbers = req.params.frameList.split(',').map(v => parseInt(v));
    if (!multipartFunc[type]) {
        return DICOMWebHandleError.sendBadRequestMessage(res , `This WADO-RS with frame cannot generate the following content type with Accept Header: ${_.get(req , "headers.accept")} 
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`);
    }
    if (!checkIsAllNumber(frameNumbers)) {
        return DICOMWebHandleError.sendBadRequestMessage(res , `${frameNumbers} MUST be number`)
    }
    try {
        let resWriteStatus =  await multipartFunc[type]["getInstance"](req.params , req, res ,  type , frameNumbers);
        if (resWriteStatus) {
            res.end();
            return;
        } else {
            return;
        }
    } catch (e) {
        return DICOMWebHandleError.sendBadRequestMessage(res , `This WADO-RS with frame cannot generate the following content type with Accept Header: ${_.get(req , "headers.accept")} 
        Can use the Accept Header below : 
        multipart/related; type=image/jpeg`);
    }
}

function checkIsAllNumber (frameNumber) {
    let isAllNumber = frameNumber.every(_.isNumber);
    return isAllNumber;
}
