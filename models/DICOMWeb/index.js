
const {dcm2jpeg, dcm2jpegCustomCmd} = require('../dcmtk');
const uuid = require('uuid');
const fs = require('fs');
const dicomParser = require('dicom-parser');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
function getBasicURL () {
    let port = `:${process.env.DICOMWEB_PORT}`;
    let url = `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}`;
    return url;
}

/**
 * 
 * @param {Object} items 
 * @param {Number} level  0=Study , 1=Series , 2=instance
 */
function setRetrieveURL (items , level) {
    for (let item of items) {
        if (level == 0) {
            item  = setStudyRetrieveURL(item);
        } else if (level ==1) {
            item = setSeriesRetrieveURL(item);
        } else if (level == 2 ){
            item = setInstancesRetrieveURL(item);
        }
    }
}
function setStudyRetrieveURL(study) {
    let studyUID = study["0020000D"].Value[0];
    let url = `${getBasicURL()}/studies/${studyUID}`;
    study["00081190"] = {
        vr : "UT" , 
        Value : [url]
    };
    return study;
}

function setSeriesRetrieveURL (series) {
    try {
        let studyUID = series["0020000D"].Value[0];
        let seriesUID = series["0020000E"].Value[0];
        let url = `${getBasicURL()}/studies/${studyUID}/series/${seriesUID}`;
        series["00081190"] = {
            vr : "UT" , 
            Value : [url]
        };
        return series;
    } catch {
        console.log(series);
        return series;
    }
}

function setInstancesRetrieveURL (instance) {
    let studyUID = instance["0020000D"].Value[0];
    let seriesUID = instance["0020000E"].Value[0];
    let instanceUID = instance["00080018"].Value[0];
    let url = `${getBasicURL()}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`;
    instance["00081190"] = {
        vr : "UT" , 
        Value : [url]
    };
    return instance;
}

function writeDICOMMultipart (res , imagesPath , type) {
    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
    for (let i= 0 ; i < imagesPath.length ; i++) {
        let image = `${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`;
        let fileBuffer = fs.readFileSync(image);
        res.write(`${i==0? "":"\r\n\r\n"}--${BOUNDORY}\r\n`);
        res.write(`Content-Type: ${type}\r\n`);
        res.write('Content-length: ' + fileBuffer.length + '\r\n\r\n');
        res.write(fileBuffer);
    }
    res.write(`\r\n--${BOUNDORY}--`);  
}

async function writeImageMultipart (res , imagesPath , type) {
    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
    for (let i= 0 ; i < imagesPath.length ; i++) {
        let images = `${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`;
        let jpegFile = images.replace(/\.dcm\b/gi , '.jpg');
        let dcm2jpegStatus = await dcm2jpeg(images);
        if (dcm2jpegStatus) {
            let fileBuffer = fs.readFileSync(jpegFile);
            let dicomFileBuffer = fs.readFileSync(images);
            let dicomDataSet = dicomParser.parseDicom(dicomFileBuffer); 
            let transferSyntax = dicomDataSet.string('x00020010');
            res.write(`${i==0? "":"\r\n\r\n"}--${BOUNDORY}\r\n`);
            res.write(`Content-Type: ${type};transfer-syntax=${transferSyntax}\r\n`);
            res.write('Content-length: ' + fileBuffer.length + '\r\n\r\n');
            res.write(fileBuffer);
        }
    }
    res.write(`\r\n--${BOUNDORY}--`);
    Promise.resolve(true);
}
async function writeframesMultipart (req , res , imagesPath ,type , frameList) {
    let execCmd = "";
    const BOUNDORY = `${uuid.v4()}-${uuid.v4()}`;
    res.set('content-type', `multipart/related; type=${type};boundary=${BOUNDORY}`);
    let images = `${process.env.DICOM_STORE_ROOTPATH}${imagesPath[0]}`;
    let jpegFile = images.replace(/\.dcm\b/gi , "");
    let minFrameNumber = _.min(frameList);
    let maxFrameNumber = _.max(frameList);
    let frameNumberCount= maxFrameNumber - minFrameNumber + 1;
    if (minFrameNumber == maxFrameNumber) {
        frameNumberCount = 1;
    }
    if (process.env.ENV == "windows") {
        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg "${images}" "${jpegFile}" --frame-range ${minFrameNumber} ${frameNumberCount}`;
    } else if (process.env.ENV == "linux") {
        execCmd = `dcmj2pnm --write-jpeg "${images}" "${jpegFile}" --frame-range ${minFrameNumber} ${frameNumberCount}`;
    }
    let dcm2jpegStatus = await dcm2jpegCustomCmd(execCmd);
    if (dcm2jpegStatus) {
        for (let x=  0 ;x < frameList.length ; x++) {
            let frameJpegFile = images.replace(/\.dcm\b/gi , `.${frameList[x]-1}.jpg`);
            let fileBuffer = fs.readFileSync(frameJpegFile);
            let dicomFileBuffer = fs.readFileSync(images);
            let dicomDataSet = dicomParser.parseDicom(dicomFileBuffer); 
            let transferSyntax = dicomDataSet.string('x00020010');
            res.write(`${x==0? "":"\r\n\r\n"}--${BOUNDORY}\r\n`);
            res.write(`Content-Type: ${type};transfer-syntax=${transferSyntax}\r\n`);
            res.write(`Content-Location : http://${req.headers.host}${req.originalUrl}\r\n`);
            res.write('Content-length: ' + fileBuffer.length + '\r\n\r\n');
            res.write(fileBuffer);
        }
    }

    res.write(`\r\n--${BOUNDORY}--`);
    Promise.resolve(true);
}


module.exports = {
    setRetrieveURL : setRetrieveURL , 
    writeDICOMMultipart : writeDICOMMultipart ,
    writeImageMultipart : writeImageMultipart ,
    writeframesMultipart : writeframesMultipart 
};
