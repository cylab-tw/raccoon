//http://dicom.nema.org/medical/dicom/2019a/output/chtml/part18/sect_6.5.html
const { logger } = require('../../../utils/log');
const mongoFunc = require('../../../models/mongodb/func');
const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const path= require('path');
const uuid = require('uuid');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const dicomWebHandleError = require('../../../models/DICOMWeb/httpMessage');
const { writeImageMultipart } = require('../../../models/DICOMWeb');
const { MultipartWriter } = require('../../../utils/multipartWriter'); // eslint-disable-line @typescript-eslint/naming-convention
const { streamToBuffer } = require('@jorgeferrero/stream-to-buffer');
module.exports = async function (req , res) {
    let keys = Object.keys(req.params);
    console.log(req.headers.accept);
    let paramsStr = "";
    for (let i = 0 ; i < keys.length ; i++) {
        paramsStr += keys[i]; 
    }
    let wadoFunc = {"studyID" : "", "studyIDseriesID": "" , "studyIDseriesIDinstanceID": ""};
    if (req.headers.accept.toLowerCase() == "application/zip") {
        let wadoZip = new WADOZip(req.params, res);
        let zipProcess = await wadoZip[`method-${paramsStr}`]();
        if (zipProcess.status) {
            res.end();
            return;
        }
        return dicomWebHandleError.sendNotFoundMessage(req , res);
    } else if (req.headers.accept.includes("multipart/related")) {
        let typeSplit = req.headers.accept.split(',');
        let acceptTypes=  [];
        for (let accept of typeSplit) {
            let matchType = accept.match(/type=(.*)/gi)[0];
            let cleanType = matchType.split(/[,;]/)[0];
            let finalType = cleanType.substring(5).replace(/"/g , "");
            let transferSyntax = "";
            if (finalType.includes('image')) {
                if (accept.includes("transfer")) {
                    let matchTransferSyntax = accept.match(/transfer-syntax=(.*)/gim)[0];
                    let cleanTransferSyntax = matchTransferSyntax.split(/[,;]/)[0];
                    transferSyntax = cleanTransferSyntax.substring(16).replace(/"/g , "");
                } else {
                    transferSyntax = "1.2.840.10008.1.2.4.50";
                }
            } else {
                if (accept.includes("transfer")) { 
                    let matchTransferSyntax = accept.match(/transfer-syntax=(.*)/gim)[0];
                    let cleanTransferSyntax = matchTransferSyntax.split(/[,;]/)[0];
                    transferSyntax = cleanTransferSyntax.substring(16).replace(/"/g , "");
                } else {
                    transferSyntax = "1.2.840.10008.1.2.1";
                }
            }
            let acceptObj = {
                type : finalType , 
                transferSyntax : transferSyntax
            };
            acceptTypes.push(acceptObj);
        }
        console.log(acceptTypes);
        let type = req.headers.accept.match(/type=(.*)/gi)[0].split(/[,;]/)[0].substring(5).replace(/"/g  ,"");
        wadoFunc = {"studyID" :"getStudyDicom", "studyIDseriesID": "getSeriesDicom" , "studyIDseriesIDinstanceID": "getInstance"};
        let getFunc = wadoFunc[paramsStr];
        if (!multipartFunc[type]) {
            return  sendNotSupportMessage(req ,res);
        }
        try {
            let resWriteStatus =  await multipartFunc[type][getFunc](req.params , res , type);
            if (resWriteStatus) {
                res.end();
                return;
            }
        } catch (e) {
            return sendNotSupportMessage(req ,res);
        }
        return dicomWebHandleError.sendNotFoundMessage(req , res);
    } else if (req.headers.accept.includes("*/*")) {
        wadoFunc = {"studyID" :"getStudyDicom", "studyIDseriesID": "getSeriesDicom" , "studyIDseriesIDinstanceID": "getInstance"};
        let getFunc = wadoFunc[paramsStr];
        let resWriteStatus =  await multipartFunc["application/dicom"][getFunc](req.params , res , "application/dicom");
        if (resWriteStatus) {
            res.end();
            return;
        }
        return dicomWebHandleError.sendNotFoundMessage(req , res);
    }
    return sendNotSupportMessage(req , res);
};

function sendNotSupportMessage(req ,res) {
    let accept = _.get(req , "headers.accept");
    if (!accept) accept = "Unknown";
    let message = {
        "Details" : `This WADO-RS server cannot generate the following content type with Accept Header: ${accept} 
        Can use the Accept Header below : 
        multipart/related; type=application/dicom
        multipart/related; type=application/octet-stream
        application/zip 
        `, 
        "HttpStatus" : 400,
        "Message" : "Bad request",
        "Method" : "GET"
    };
    res.status(400).send(message);
    res.end();  
}

let multipartFunc = {
    "application/dicom" : {
        getStudyDicom : async function (iParam , res , type) {
            logger.info(`[Write DICOM files of study] [Params: ${JSON.stringify(iParam)}]`);
            let imagesPath = await mongoFunc.getStudyImagesPath(iParam);
            let multipartWriter = new MultipartWriter(imagesPath, res);
            return multipartWriter.writeDICOMFiles(type);
        } , 
        getSeriesDicom : async function (iParam , res , type) {
            logger.info(`[Write DICOM files of series] [Params: ${JSON.stringify(iParam)}]`);
            let seriesImagesPath = await mongoFunc.getSeriesImagesPath(iParam);
            let multipartWriter = new MultipartWriter(seriesImagesPath, res);
            return multipartWriter.writeDICOMFiles(type);
        } , 
        getInstance : async function (iParam , res , type) {
            logger.info(`[Write DICOM files of instance] [Params: ${JSON.stringify(iParam)}]`);
            let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
            let multipartWriter = new MultipartWriter(imagesPath, res);
            return multipartWriter.writeDICOMFiles(type);
        }
    } 
};
multipartFunc["application/octet-stream"] = {
    getStudyDicom : multipartFunc["application/dicom"].getStudyDicom ,
    getSeriesDicom : multipartFunc["application/dicom"].getSeriesDicom , 
    getInstance : multipartFunc["application/dicom"].getInstance
};
multipartFunc["image/jpeg"] = {
    getInstance:  async function (iParam , res , type) {
        return new Promise (async (resolve)=> {
            let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
            if (imagesPath) {
                await writeImageMultipart(res , imagesPath , type);
                return resolve(true);    
            }
            return resolve(false);
        });
    }
};

function nl2br (str) {
    return str.replace(/\\r|\\n|\\r\\n/gi , "<br/>");
}

class WADOZip {
    constructor(iParam, iRes) {
        this.requestParams = iParam;
        this.studyID = iParam.studyID;
        this.seriesID = iParam.seriesID;
        this.instanceID = iParam.instanceID;
        this.res = iRes;
        this["method-studyID"] = this.getZipOfStudyDICOMFiles;
        this["method-studyIDseriesID"] = this.getZipOfSeriesDICOMFiles;
        this["method-studyIDseriesIDinstanceID"] = this.getZipOfInstanceDICOMFile;
    }

    setHeaders() {
        let rndNum = crypto.randomBytes(5).toString('hex');
        let timestamp = new Date().getTime();
        let storeZipName = `${rndNum}_${timestamp}`;

        this.res.attachment = `${storeZipName}.zip`;
        this.res.setHeader('Content-Type', 'application/zip');
        this.res.setHeader('Content-Disposition', `attachment; filename=${storeZipName}.zip`);
    }
    async getZipOfStudyDICOMFiles() {
        return new Promise(async (resolve)=> {
            let imagesPath = await mongoFunc.getStudyImagesPath(this.requestParams);
            if (imagesPath) {
                this.setHeaders();

                let archive = archiver('zip', {
                    gzip: true,
                    zlib: { level: 9 } // Sets the compression level.
                });
                archive.on('error', function (err) {
                    console.error(err);
                    resolve({
                        status: false,
                        data: err
                    });
                });
                archive.pipe(this.res);
                let folders = [];
                for (let i = 0; i < imagesPath.length; i++) {
                    let imagesFolder = path.dirname(imagesPath[i]);
                    if (!folders.includes(imagesFolder)) {
                        folders.push(imagesFolder);
                    }
                }
                for (let i = 0; i < folders.length; i++) {
                    let folderName = path.basename(folders[i]);
                    let folderAbsPath = path.join(process.env.DICOM_STORE_ROOTPATH, folders[i]);
                    archive.directory(folderAbsPath, folderName);
                }
                await archive.finalize();
                resolve({
                    status: true,
                    data: "Pipe zip file of study DICOM files"
                });
            }
            resolve({
                status: false,
                data: "Gone"
            });
        });
    }

    async getZipOfSeriesDICOMFiles() {
        return new Promise(async (resolve) => {
            let imagesPath = await mongoFunc.getSeriesImagesPath(this.requestParams);

            if (imagesPath) {
                this.setHeaders();

                let archive = archiver('zip', {
                    gzip: true,
                    zlib: { level: 9 } // Sets the compression level.
                });
                archive.on('error', function (err) {
                    console.error(err);
                    return resolve({
                        status: false,
                        data: err
                    });
                });
                archive.pipe(this.res);
                for (let i = 0; i < imagesPath.length; i++) {
                    let pathSplit = imagesPath[i].split('/');
                    let storeName = pathSplit[pathSplit.length - 1];
                    let archiveFilename = path.join(process.env.DICOM_STORE_ROOTPATH, imagesPath[i]);
                    archive.file(archiveFilename, { name: storeName });
                }
                await archive.finalize();
                return resolve({
                    status: true,
                    data: "Pipe zip file of study DICOM files"
                });
            }
            return resolve({
                status: false,
                data: "gone"
            });
        });
    }

    async getZipOfInstanceDICOMFile() {
        return new Promise(async (resolve) => {
            let imagesPath = await mongoFunc.getInstanceImagePath(this.requestParams);
            if (imagesPath) {
                this.setHeaders();

                let archive = archiver('zip', {
                    gzip: true,
                    zlib: { level: 9 } // Sets the compression level.
                });
                archive.on('error', function (err) {
                    console.log(err);
                    resolve({
                        status: false,
                        data: err
                    });
                });
                archive.pipe(this.res);
                let archiveFilename = path.join(process.env.DICOM_STORE_ROOTPATH, imagesPath[0]);
                archive.file(archiveFilename, { name: path.basename(imagesPath[0]) });
                await archive.finalize();
                resolve({
                    status: true,
                    data: "Pipe zip file of study DICOM files"
                });
            }
            resolve({
                status: false,
                data: "Gone"
            });
        });
    }
}

module.exports.multipartFunc = multipartFunc;