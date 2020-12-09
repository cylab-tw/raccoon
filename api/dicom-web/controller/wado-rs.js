const mongoFunc = require('../../../models/mongodb/func');
const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const path= require('path');
const uuid = require('uuid');
const _ = require('lodash');
module.exports = async function (req , res) {
    let keys = Object.keys(req.params);
    console.log(req.headers.accept);
    let paramsStr = "";
    for (let i = 0 ; i < keys.length ; i++) {
        paramsStr += keys[i]; 
    }
    let WADOFunc = {"studyID" :getStudyDicom, "studyIDseriesID": getSeriesDicom , "studyIDseriesIDinstanceID": getInstance};
    if (req.headers.accept.toLowerCase() == "application/zip") {
        let imageFiles = await WADOFunc[paramsStr](req.params , res);
        if (imageFiles) {
            res.end();
            return;
        }
        sendNotFoundMessage(req ,res , paramsStr);
    } else if (req.headers.accept.includes("multipart/related")) {
        let typeSplit = req.headers.accept.split(',');
        let acceptTypes=  [];
        for (let accept of typeSplit) {
            let matchType =accept.match(/type=(.*)/gi)[0];
            let cleanType = matchType.split(/[,;]/)[0];
            let finalType = cleanType.substring(5).replace(/"/g , "");
            acceptTypes.push(finalType);
        }
        let type = req.headers.accept.match(/type=(.*)/gi)[0].split(/[,;]/)[0].substring(5).replace(/"/g  ,"");
        WADOFunc = {"studyID" :"getStudyDicom", "studyIDseriesID": "getSeriesDicom" , "studyIDseriesIDinstanceID": "getInstance"};
        let getFunc = WADOFunc[paramsStr];
        if (!multipartFunc[type]) {
            sendNotSupportMessage(req ,res);
            return;
        }
        let resWriteStatus =  await multipartFunc[type][getFunc](req.params , res , type);
        if (resWriteStatus) {
            res.end();
            return;
        }
        sendNotFoundMessage(req ,res , paramsStr);
    } else {
        let typeSplit = req.headers.accept.split(',');
        let acceptTypes=  [];
        /*for (let accept of typeSplit) {
            let matchType =accept.match(/type=(.*)/gi)[0];
            let cleanType = matchType.split(/[,;]/)[0];
            let finalType = cleanType.substring(5).replace(/"/g , "");
            acceptTypes.push(finalType);
        }*/
        WADOFunc = {"studyID" :"getStudyDicom", "studyIDseriesID": "getSeriesDicom" , "studyIDseriesIDinstanceID": "getInstance"};
        let getFunc = WADOFunc[paramsStr];
        let resWriteStatus =  await multipartFunc["application/dicom"][getFunc](req.params , res , "application/dicom");
        if (resWriteStatus) {
            res.end();
            return;
        }
        sendNotFoundMessage(req ,res , paramsStr);
        //sendNotSupportMessage(req , res);
    }
}

function sendNotSupportMessage(req ,res) {
    let accept = _.get(req , "headers.accept");
    if (!accept) accept = "Unknown"
    let message = {
        "Details" : `This WADO-RS server cannot generate the following content type with Accept Header: ${accept} 
        Can use the Accept Header below : 
        multipart/related; type=application/dicom
        multipart/related; type=application/octet-stream
        application/zip 
        `, 
        "HttpStatus" : 400,
        "Message" : "Bad request",
        "Method" : "GET",
    }
    res.status(400).write(`<pre>${nl2br(JSON.stringify(message , null , 4))}</pre>`);
    res.end();  
}

async function getStudyDicom(iParam ,res) {
    return new Promise (async (resolve)=> {
        let imagesPath = await mongoFunc.getStudyImagesPath(iParam);

        if (imagesPath) {
            let rndNum = crypto.randomBytes(5).toString('hex');
            let timespam = new Date().getTime();
            let storeZipName = `${rndNum}_${timespam}`
            
            res.attachment = `${storeZipName}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${storeZipName}.zip`);
            
            let archive = archiver('zip', {
                gzip: true ,
                zlib: { level: 9 } // Sets the compression level.
            });
            archive.on('error', function(err) {
                console.log(err);
                return resolve(false);
            });
            archive.pipe(res);
            let folders = [];
            for (let i= 0 ; i < imagesPath.length ; i++) {
                let imagesFolder = path.dirname(imagesPath[i]);
                if (!folders.includes(imagesFolder)) {
                    folders.push(imagesFolder);
                }
            }
            for (let i = 0; i < folders.length ; i++) {
                let folderName = path.basename(folders[i]);
                archive.directory(`${process.env.DICOM_STORE_ROOTPATH}${folders[i]}` , folderName);
            }
            await archive.finalize();
            console.log("getStudy");
            return resolve(true);
        }
        return resolve(false);
    });
}

async function getSeriesDicom(iParam , res) {
    return new Promise(async (resolve)=> {
        let imagesPath = await mongoFunc.getSeriesImagesPath(iParam);

        if (imagesPath) {
            let rndNum = crypto.randomBytes(5).toString('hex');
            let timespam = new Date().getTime();
            let storeZipName = `${rndNum}_${timespam}`
            res.attachment = `${storeZipName}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${storeZipName}.zip`);
           
            let archive = archiver('zip', {
                gzip: true ,
                zlib: { level: 9 } // Sets the compression level.
            });
            archive.on('error', function(err) {
                console.log(err);
                return resolve(false);
            });
            archive.pipe(res);
            for (let i = 0; i < imagesPath.length ; i++) {
                let pathSplit = imagesPath[i].split('/');
                let storeName = pathSplit[pathSplit.length-1];
                archive.file(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}` , {name : storeName});
            }
            await archive.finalize();
            console.log("getSeries");
            return resolve(true);
        }
        return resolve(false);
    });
}
async function getInstance(iParam ,res) {
    return new Promise(async (resolve) => {
        let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
        if (imagesPath) {
            /*res.writeHead(200 , 
            {
                'Content-Type' : 'application/dicom' ,
                'Content-Disposition' :'attachment; filename=' + path.basename(imagesPath[0])
            });*/
            let rndNum = crypto.randomBytes(5).toString('hex');
            let timespam = new Date().getTime();
            let storeZipName = `${rndNum}_${timespam}`
            res.attachment = `${storeZipName}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${storeZipName}.zip`);
            let archive = archiver('zip', {
                gzip: true ,
                zlib: { level: 9 } // Sets the compression level.
            });
            archive.on('error', function(err) {
                console.log(err);
                return resolve(false);
            });
            archive.pipe(res);
            archive.file(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[0]}` , {name : path.basename(imagesPath[0])});
            await archive.finalize();
            return resolve(true);
        }
        return resolve(false);
    });
}
let multipartFunc = {
    "application/dicom" : {
        getStudyDicom : async function (iParam , res , type) {
            return new Promise (async (resolve)=> {
                let imagesPath = await mongoFunc.getStudyImagesPath(iParam);
                if (imagesPath) {
                    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
                    for (let i= 0 ; i < imagesPath.length ; i++) {
                        console.log(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                        let fileBuffer = fs.readFileSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                        res.write(`${i==0? "":"\n\n"}--${BOUNDORY}\n`);
                        res.write(`Content-Type: ${type}\n`);
                        res.write('Content-length: ' + fileBuffer.length + '\n\n');
                        res.write(fileBuffer);
                    }
                    res.write(`\n--${BOUNDORY}--`);
                    return resolve(true);
                }
                return resolve(false);
            });
        } , 
        getSeriesDicom : async function (iParam , res , type) {
            return new Promise(async (resolve)=> {
                let imagesPath = await mongoFunc.getSeriesImagesPath(iParam);
                if (imagesPath) {
                    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
                    for (let i= 0 ; i < imagesPath.length ; i++) {
                        console.log(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                        let fileBuffer = fs.readFileSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                        res.write(`${i==0? "":"\n\n"}--${BOUNDORY}\n`);
                        res.write(`Content-Type: ${type}\n`);
                        res.write('Content-length: ' + fileBuffer.length + '\n\n');
                        res.write(fileBuffer);
                    }
                    res.write(`\n--${BOUNDORY}--`);
                    return resolve(true);
                }
                return resolve(false);
            });
        } , 
        getInstance : async function (iParam , res , type) {
            return new Promise (async (resolve)=> {
                let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
                if (imagesPath) {
                    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
                    let fileBuffer = fs.readFileSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[0]}`);
                    console.log(imagesPath[0]);
                    res.write(`--${BOUNDORY}\n`);
                    res.write(`Content-Type: ${type}\n`);
                    res.write('Content-length: ' + fileBuffer.length + '\n\n');
                    res.write(fileBuffer);
                    res.write(`\n--${BOUNDORY}--`);
                    return resolve(true);
                }
                return resolve(false);
            });
        }
    } 
}
multipartFunc["application/octet-stream"] = {
    getStudyDicom : multipartFunc["application/dicom"].getStudyDicom ,
    getSeriesDicom : multipartFunc["application/dicom"].getSeriesDicom , 
    getInstance : multipartFunc["application/dicom"].getInstance
}
multipartFunc["image/jpeg"] = {
    
}

function nl2br (str) {
    return str.replace(/\\r|\\n|\\r\\n/gi , "<br/>");
}

function sendNotFoundMessage (req , res , paramsStr){
    let getName =  {"studyID" :"study", "studyIDseriesID": "series" , "studyIDseriesIDinstanceID": "instance"};
    let getUID = {"studyID" :req.params.studyID, "studyIDseriesID": req.params.seriesID , "studyIDseriesIDinstanceID": req.params.instanceID};
    let message = {
        "Details" : `Accessing an inexistent ${getName[paramsStr]} : ${getUID[paramsStr]}`, 
        "HttpStatus" : 404,
        "Message" : "Bad request",
        "Method" : "GET",
    }
    res.write((JSON.stringify(message , null , 4)));
    res.status(404);
    res.end();  
}