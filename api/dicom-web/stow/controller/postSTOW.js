'use strict';
const path = require('path');
const fs = require('fs');
const request = require('request');
const FHIR_Imagingstudy_model = require("../../../../models/FHIR/DICOM2FHIRImagingStudy");
const { DCM2Endpoint_imagingStudy } = require("../../../../models/FHIR/DICOM2Endpoint");
const sh = require('shorthash');
const fileFunc = require('../../../../models/file/file_Func');
const { QIDORetAtt } = require('../../../../models/FHIR/dicom-tag');
const DCM2Patient = require('../../../../models/FHIR/DICOM2FHIRPatient');
const _ = require('lodash');
const { dcm2jpegCustomCmd, dcm2jsonV8, dcmtkSupportTransferSyntax } = require('models/dcmtk');
const moment = require('moment');
const formidable = require('../../../../models/formidable');
const { sendServerWrongMessage } = require('../../../../models/DICOMWeb/httpMessage');
const moveFile = require('move-file');
const uuid = require('uuid');
const { getJpeg } = require('../../../../models/python');
const mongodb = require('../../../../models/mongodb');
const { getData } = require('../../../FHIR/ImagingStudy/controller/post_convertFHIR');
//browserify
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/Formidable.js#L496
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/plugins/multipart.js#L47
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/examples/multipart-parser.js#L13
async function dicom2mongodb(data) {
    return new Promise(async (resolve) => {
        let result = await require('../../../FHIR/ImagingStudy/controller/putImagingStudy').putWithoutReq(data.id, data);
        if (result) return resolve(true);
        return resolve(false);
    });
}

async function dicom2FHIR(data) {
    return new Promise(async (resolve, reject) => {
        let resData = await getData(data.id, data);
        return resolve(resData);
    });
}

async function dicomEndpoint2MongoDB(data) {
    return new Promise((resolve, reject) => {
        let options =
        {
            method: "PUT",
            url: `http://${process.env.FHIRSERVER_HOST}:${process.env.SERVER_PORT}/api/fhir/Endpoint/${data.id}`,
            json: true,
            body: data
        }
        request(options, function (err, response, body) {
            if (err) {
                return reject(new Error(err));
            }
            return resolve(body);
        });
    });
}

async function dicomPatient2MongoDB(data) {
    return new Promise(async (resolve) => {
        let patient = await DCM2Patient.DCMJson2Patient(data);
        let Insert_Patient_options = {
            url: `http://${process.env.FHIRSERVER_HOST}:${process.env.SERVER_PORT}/api/fhir/Patient/${patient.id}`,
            method: "PUT",
            json: true,
            body: patient
        }
        request(Insert_Patient_options, function (err, response, body) {
            if (err) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

async function generateJpeg(dicomJson, dicomFile, jpegFile) {
    try {
        console.time("generate jpeg");
        let studyUID = _.get(dicomJson, '0020000D.Value.0');
        let seriesUID = _.get(dicomJson, '0020000E.Value.0');
        let instanceUID = _.get(dicomJson, '00080018.Value.0');
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: false,
            message: "processing"
        });
        let windowCenter = _.get(dicomJson, '00281050.Value.0');
        let windowWidth = _.get(dicomJson, '00281051.Value.0');
        let frameNumber = _.get(dicomJson, '00280008.Value.0', 1);
        let transferSyntax = _.get(dicomJson, "00020010.Value.0");
        let execCmd = "";
        let execCmdList = [];
        if (dcmtkSupportTransferSyntax.includes(transferSyntax)) {
            for (let i = 1; i <= frameNumber; i++) {
                if (process.env.ENV == "windows") {
                    if (windowCenter && windowWidth) {
                        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg ${dicomFile} ${jpegFile}.${i - 1}.jpg --frame ${i} +Ww ${windowCenter} ${windowWidth}`;
                    } else {
                        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg ${dicomFile} ${jpegFile}.${i - 1}.jpg --frame ${i}`;
                    }
                } else if (process.env.ENV == "linux") {
                    if (windowCenter && windowWidth) {
                        execCmd = `dcmj2pnm --write-jpeg ${dicomFile} ${jpegFile}.${i - 1}.jpg --frame ${i} +Ww ${windowCenter} ${windowWidth}`;
                    } else {
                        execCmd = `dcmj2pnm --write-jpeg ${dicomFile} ${jpegFile}.${i - 1}.jpg --frame ${i}`;
                    }
                }
                execCmdList.push(execCmd);
            }
            await Promise.all(execCmdList.map(cmd => dcm2jpegCustomCmd(cmd)))
            console.timeEnd("generate jpeg");
        } else {
            for (let i = 1; i <= frameNumber; i++) {
                await getJpeg[process.env.ENV].getJpegByPydicom(dicomFile, i);
            }
            console.timeEnd("generate jpeg");
        }
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: true,
            message: "generated"
        });
    } catch (e) {
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: true,
            message: e.toString()
        });
        console.error(e);
        throw e;
    }
}

async function saveDicomFile(fhirData, tempFilename, filename) {
    let started_date = new Date(fhirData.started).toISOString();
    let started_date_split = started_date.split('-');
    let year = started_date_split[0];
    let month = started_date_split[1];
    let uid = fhirData.series[0].uid;
    let uuid = sh.unique(uid);
    let new_store_path = `files/${year}/${month}/${uuid}/${filename}`
    fhirData.series[0].instance[0].store_path = new_store_path;
    let newStorePathWithRoot = path.join(process.env.DICOM_STORE_ROOTPATH, new_store_path);
    if (await fileFunc.mkdir_Not_Exist(newStorePathWithRoot)) {
        await moveFile(tempFilename, newStorePathWithRoot, {
            overwrite: true
        });
        return newStorePathWithRoot;
    }
    return undefined;
}

async function saveUploadDicom(tempFilename, filename) {
    return new Promise(async (resolve, reject) => {
        let maxSize = 500 * 1024 * 1024;
        let fileSize = fs.statSync(tempFilename).size;
        let fhirData = "";
        if (fileSize > maxSize) {
            if (_.isString(tempFilename)) {
                let dcmJson = await dcm2jsonV8.exec(tempFilename);
                fhirData = await FHIR_Imagingstudy_model.DCMJson2FHIR(dcmJson);
            }
        } else {
            fhirData = await FHIR_Imagingstudy_model.DCM2FHIR(tempFilename).catch((err) => {
                console.error(err);
                fs.unlinkSync(tempFilename);
                return resolve(false);
            });
        }
        if (!fhirData) {
            fs.unlinkSync(tempFilename);
            return resolve(false);
        }
        // let fhirData = fhirDataList[0];
        if (!fhirData.started) {
            fs.unlinkSync(tempFilename);
            return resolve(false);
        }
        let newStoredFilename = await saveDicomFile(fhirData, tempFilename, filename);
        if (_.isUndefined(newStoredFilename)) {
            return resolve(false);
        }
        fhirData = await getFHIRIntegrateDICOMJson(newStoredFilename, fhirData);
        return resolve(fhirData);
    });
}

function insertMetadata(metadata) {
    return new Promise(async (resolve) => {
        try {
            await mongodb.dicomMetadata.updateOne({
                'studyUID': metadata.studyUID,
                'seriesUID': metadata.seriesUID,
                'instanceUID': metadata.instanceUID
            }, metadata, {
                upsert: true
            });
            return resolve(true);
        } catch (e) {
            console.error(e);
            return resolve(false);
        }
    });
}

async function insertDicomToJpegTask(item) {
    return new Promise(async (resolve) => {
        try {
            await mongodb.dicomToJpegTask.updateOne({
                'studyUID': item.studyUID,
                'seriesUID': item.seriesUID,
                'instanceUID': item.instanceUID
            }, item, {
                upsert: true
            })
            resolve(true);
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    });
}

async function getFHIRIntegrateDICOMJson(filename, fhirData) {
    let dicomJson = "";
    try {
        dicomJson = await dcm2jsonV8.exec(filename);
    } catch (e) {
        console.error(e);
        throw e;
    }
    delete dicomJson["7fe00010"];
    let jpegFile = filename.replace(/\.dcm/gi, '');
    generateJpeg(dicomJson, filename, jpegFile);
    let QIDOLevelKeys = Object.keys(QIDORetAtt);
    let QIDOAtt = Object.assign({}, QIDORetAtt);
    for (let i = 0; i < QIDOLevelKeys.length; i++) {
        let levelTags = Object.keys(QIDORetAtt[QIDOLevelKeys[i]]);
        for (let x = 0; x < levelTags.length; x++) {
            let nowLevelKeyItem = QIDOAtt[QIDOLevelKeys[i]];
            let setValueTag = levelTags[x];
            if (dicomJson[setValueTag]) {
                nowLevelKeyItem[setValueTag] = dicomJson[setValueTag];
            } else {
                if (!_.isObject(nowLevelKeyItem[setValueTag])) {
                    delete nowLevelKeyItem[setValueTag];
                }
            }
        }
    }
    //QIDOAtt.instance = dicomJson;
    let port = process.env.DICOMWEB_PORT || "";
    port = (port) ? `:${port}` : "";
    QIDOAtt.study['00081190'] = {
        vr: "UT",
        Value: [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}`]
    }
    fhirData['dicomJson'] = QIDOAtt.study;
    QIDOAtt.series['00081190'] = {
        vr: "UT",
        Value: [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}`]
    }
    fhirData.series[0].dicomJson = QIDOAtt.series;
    QIDOAtt.instance['00081190'] = {
        vr: "UT",
        Value: [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}/instances/${QIDOAtt.instance['00080018'].Value[0]}`]
    }
    fhirData.series[0].instance[0].dicomJson = QIDOAtt.instance;
    dicomJson["7FE00010"] = {
        "vr": "OW",
        "BulkDataURI": `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}/instances/${QIDOAtt.instance['00080018'].Value[0]}`
    }

    //fhirData.series[0].instance[0].metadata = dicomJson;
    for (let i in fhirData.dicomJson["00080020"].Value) {
        fhirData.dicomJson["00080020"].Value[i] = moment(fhirData.dicomJson["00080020"].Value[i], "YYYYMMDD").toDate();
    }
    let metadata = _.cloneDeep(dicomJson);
    _.set(metadata, 'studyUID', metadata["0020000D"].Value[0]);
    _.set(metadata, 'seriesUID', metadata["0020000E"].Value[0]);
    _.set(metadata, 'instanceUID', metadata["00080018"].Value[0]);
    await insertMetadata(metadata);
    return fhirData;
}
/* Failure Reason
A7xx - Refused out of Resources

    The STOW-RS Service did not store the instance because it was out of resources.
A9xx - Error: Data Set does not match SOP Class

    The STOW-RS Service did not store the instance because the instance does not conform to its specified SOP Class.
Cxxx - Error: Cannot understand

    The STOW-RS Service did not store the instance because it cannot understand certain Data Elements.
C122 - Referenced Transfer Syntax not supported

    The STOW-RS Service did not store the instance because it does not support the requested Transfer Syntax for the instance.
0110 - Processing failure

    The STOW-RS Service did not store the instance because of a general failure in processing the operation.
0122 - Referenced SOP Class not supported

    The STOW-RS Service did not store the instance because it does not support the requested SOP Class. 
 */
function getSOPSeq(referencedSOPClassUID, referencedSOPInstanceUID) {
    let result = {
        "00081150": {
            vr: "UI",
            Value: [referencedSOPClassUID]
        },
        "00081155": {
            vr: "UI",
            Value: [referencedSOPInstanceUID]
        }
    }
    return result;
}


function checkIsSameStudyId(req, fhirData) {
    let inputID = req.params.studyID;
    let dataStudyID = fhirData.identifier[0].value.substring(8);
    return inputID == dataStudyID;
}

module.exports = async (req, res) => {
    //store the successFiles;
    let successFiles = [];
    let successFHIR = [];
    let successFilesStorePath = [];
    let STOWMessage = {
        "00081190": {  //Study retrive URL
            "vr": "UT",
            "Value": []
        },
        "00081198": {  //Failed SOP Sequence
            "vr": "SQ",
            "Value": [] // Use SOPSeq
        },
        "00081199": { //ReferencedSOPSequence
            "vr": "SQ",
            "Value": [] // Use SOPSeq
        }
    }
    let retCode = 200;
    console.time("Processing STOW");

    new formidable.IncomingForm({
        uploadDir: path.join(process.cwd(), "/temp"),
        maxFileSize: 100 * 1024 * 1024 * 1024,
        multiples: true,
        isGetBoundaryInData: true
    }).parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            return sendServerWrongMessage(res, err);
        } else {
            let fileField = Object.keys(files).pop();
            let uploadedFiles = files[fileField];
            if (!_.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];
            //main-process
            try {
                //if env FHIR_NEED_PARSE_PATIENT is true then post the patient data
                let isNeedParsePatient = process.env.FHIR_NEED_PARSE_PATIENT == "true";
                for (let i = 0; i < uploadedFiles.length; i++) {
                    if (!uploadedFiles[i].name) uploadedFiles[i].name = `${uuid.v4()}.dcm`;
                    let FHIRData = await saveUploadDicom(uploadedFiles[i].path, uploadedFiles[i].name);
                    if (!FHIRData) {
                        continue;
                    }
                    let sopClass = FHIRData.series[0].instance[0].sopClass.code.substring(8);
                    let sopInstanceUID = FHIRData.series[0].instance[0].uid;
                    let sopSeq = getSOPSeq(sopClass, sopInstanceUID);
                    if (req.params.studyID) {
                        if (!checkIsSameStudyId(req, FHIRData)) {
                            let failureMessage = {
                                "00081197": {
                                    vr: "US",
                                    Value: ["A900"]
                                }
                            }
                            Object.assign(sopSeq, failureMessage);
                            STOWMessage["00081198"].Value.push(sopSeq);
                            retCode = 409;
                            continue;
                        }
                    }
                    let port = process.env.DICOMWEB_PORT || "";
                    port = (port) ? `:${port}` : "";
                    STOWMessage["00081190"].Value.push(...FHIRData.dicomJson["00081190"].Value);
                    STOWMessage["00081190"].Value = _.uniq(STOWMessage["00081190"].Value);
                    let retriveInstanceUrl = {
                        "00081190": FHIRData.series[0].instance[0].dicomJson["00081190"]
                    }
                    Object.assign(sopSeq, retriveInstanceUrl);
                    STOWMessage["00081199"]["Value"].push(sopSeq);
                    let endPoint = await DCM2Endpoint_imagingStudy(FHIRData);
                    await dicomEndpoint2MongoDB(endPoint);
                    if (isNeedParsePatient) {
                        let dcmJson = await dcm2jsonV8.exec(path.join(process.env.DICOM_STORE_ROOTPATH
                            , FHIRData.series[0].instance[0].store_path));
                        await dicomPatient2MongoDB(dcmJson);
                    }
                    FHIRData.endpoint = {
                        reference: `Endpoint/${endPoint.id}`,
                        type: "Endpoint"
                    }
                    let FHIRmerge = await dicom2FHIR(FHIRData);
                    await dicom2mongodb(FHIRmerge);
                    let baseFileName = path.basename(uploadedFiles[i].name);
                    successFHIR.push(baseFileName);
                    successFiles.push(baseFileName);
                    successFilesStorePath.push(FHIRData.series[0].instance[0].store_path);
                }
                res.header("Content-Type", "application/json");
                let resMessage = {
                    result: successFiles,
                    //storePath : successFilesStorePath ,
                    successFHIR: successFHIR
                }
                Object.assign(resMessage, STOWMessage);
                console.timeEnd("Processing STOW");
                return res.status(retCode).send(resMessage);
            } catch (err) {
                err = err.message || err;
                console.log('/dicom-web/studies "STOW Api" err, ', err);
                console.log(successFiles);
                return res.status(500).send(err)
            }
        }
    });
}



module.exports.STOWWithoutRoute = async (filename) => {
    //store the successFiles;
    let successFiles = [];
    let successFHIR = [];
    let successFilesStorePath = [];
    let STOWMessage = {
        "00081190": {  //Study retrive URL
            "vr": "UT",
            "Value": []
        },
        "00081198": {  //Failed SOP Sequence
            "vr": "SQ",
            "Value": [] // Use SOPSeq
        },
        "00081199": { //ReferencedSOPSequence
            "vr": "SQ",
            "Value": [] // Use SOPSeq
        }
    }
    try {
        let readstream = fs.createReadStream(filename);
        //if env FHIR_NEED_PARSE_PATIENT is true then post the patient data
        let isNeedParsePatient = process.env.FHIR_NEED_PARSE_PATIENT == "true";
        let FHIRData = await saveUploadDicom(filename, path.basename(filename));
        if (!FHIRData) {
            return false;
        }
        let sopClass = FHIRData.series[0].instance[0].sopClass.code.substring(8);
        let sopInstanceUID = FHIRData.series[0].instance[0].uid;
        let sopSeq = getSOPSeq(sopClass, sopInstanceUID);
        let port = process.env.DICOMWEB_PORT || "";
        port = (port) ? `:${port}` : "";
        STOWMessage["00081190"].Value.push(...FHIRData.dicomJson["00081190"].Value);
        STOWMessage["00081190"].Value = _.uniq(STOWMessage["00081190"].Value);
        let retriveInstanceUrl = {
            "00081190": FHIRData.series[0].instance[0].dicomJson["00081190"]
        }
        Object.assign(sopSeq, retriveInstanceUrl);
        STOWMessage["00081199"]["Value"].push(sopSeq);
        let endPoint = await DCM2Endpoint_imagingStudy(FHIRData);
        await dicomEndpoint2MongoDB(endPoint);
        if (isNeedParsePatient) {
            let dcmJson = await dcm2jsonV8.exec(path.join(process.env.DICOM_STORE_ROOTPATH
                , FHIRData.series[0].instance[0].store_path));
            await dicomPatient2MongoDB(dcmJson);
        }
        FHIRData.endpoint = {
            reference: `Endpoint/${endPoint.id}`,
            type: "Endpoint"
        }
        let FHIRmerge = await dicom2FHIR(FHIRData);

        await dicom2mongodb(FHIRmerge);
        let baseFileName = path.basename(filename);
        successFHIR.push(baseFileName);
        successFiles.push(baseFileName);
        successFilesStorePath.push(FHIRData.series[0].instance[0].store_path);
        let resMessage = {
            result: successFiles,
            //storePath : successFilesStorePath ,
            successFHIR: successFHIR
        }
        Object.assign(resMessage, STOWMessage);
        return resMessage;
    } catch (err) {
        err = err.message || err;
        console.log('/dicom-web/studies "STOW Api" err, ', err);
        return false;
    }
}