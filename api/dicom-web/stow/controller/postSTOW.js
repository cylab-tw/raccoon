const path = require("path");
const fs = require("fs");
const request = require("request");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const { performance } = require("perf_hooks");

const fhirImagingStudyModel = require("../../../../models/FHIR/DICOM2FHIRImagingStudy");
const {
    dcm2EndpointFromImagingStudy
} = require("../../../../models/FHIR/DICOM2Endpoint");
const dcm2Patient = require("../../../../models/FHIR/DICOM2FHIRPatient");
const {
    putFHIRImagingStudyWithoutReq
} = require("../../../FHIR/ImagingStudy/controller/putImagingStudy");

const sh = require("shorthash");
const fileFunc = require("../../../../models/file/file_Func");
const { qidoRetAtt } = require("../../../../models/FHIR/dicom-tag"); // eslint-disable-line @typescript-eslint/naming-convention

const {
    dcm2jpegCustomCmd,
    dcm2jsonV8,
    dcmtkSupportTransferSyntax
} = require("../../../../models/dcmtk");
const moment = require("moment");
const formidable = require("formidable");
const {
    sendServerWrongMessage
} = require("../../../../models/DICOMWeb/httpMessage");
const moveFile = require("move-file");
const uuid = require("uuid");
const { getJpeg } = require("../../../../models/python");
const mongodb = require("../../../../models/mongodb");
const {
    storeImagingStudy
} = require("../../../FHIR/ImagingStudy/controller/post_convertFHIR");
const mkdirp = require("mkdirp");
const notImageSOPClass = require("../../../../models/DICOMWeb/notImageSOPClass");
const flat = require("flat");
const { logger } = require("../../../../utils/log");

//browserify
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/Formidable.js#L496
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/plugins/multipart.js#L47
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/examples/multipart-parser.js#L13
async function dicom2mongodb(data) {
    return new Promise(async (resolve) => {
        logger.info(`[STOW-RS] [Store ImagingStudy, ID: ${data.id}]`);
        let result = await putFHIRImagingStudyWithoutReq(data.id, data);
        if (result) return resolve(true);
        return resolve(false);
    });
}

async function dicom2FHIR(data) {
    return new Promise(async (resolve, reject) => {
        let resData = await storeImagingStudy(data.id, data);
        return resolve(resData);
    });
}

async function dicomEndpoint2MongoDB(data) {
    return new Promise((resolve, reject) => {
        let port = process.env.FHIRSERVER_PORT || "";
        port = port ? `:${port}` : "";
        let options = {
            method: "PUT",
            url: `${process.env.FHIRSERVER_HTTP}://${process.env.FHIRSERVER_HOST}${port}/api/fhir/Endpoint/${data.id}`,
            json: true,
            body: data
        };
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
        let port = process.env.FHIRSERVER_PORT || "";
        port = port ? `:${port}` : "";
        let patient = dcm2Patient.dcmJson2Patient(data);
        let insertPatientOptions = {
            url: `${process.env.FHIRSERVER_HTTP}://${process.env.FHIRSERVER_HOST}${port}/api/fhir/Patient/${patient.id}`,
            method: "PUT",
            json: true,
            body: patient
        };
        request(insertPatientOptions, function (err, response, body) {
            if (err) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

async function generateJpeg(dicomJson, dicomFile, jpegFile) {
    let studyUID = _.get(dicomJson, "0020000D.Value.0");
    let seriesUID = _.get(dicomJson, "0020000E.Value.0");
    let instanceUID = _.get(dicomJson, "00080018.Value.0");
    try {
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: false,
            message: "processing",
            taskTime: new Date(),
            finishedTime: null,
            fileSize: (fs.statSync(dicomFile).size / 1024 / 1024).toFixed(3)
        });
        let windowCenter = _.get(dicomJson, "00281050.Value.0");
        let windowWidth = _.get(dicomJson, "00281051.Value.0");
        let frameNumber = _.get(dicomJson, "00280008.Value.0", 1);
        let transferSyntax = _.get(dicomJson, "00020010.Value.0");
        let execCmd = "";
        let execCmdList = [];
        if (dcmtkSupportTransferSyntax.includes(transferSyntax)) {
            for (let i = 1; i <= frameNumber; i++) {
                if (process.env.ENV == "windows") {
                    if (windowCenter && windowWidth) {
                        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg "${dicomFile}" "${jpegFile}.${
                            i - 1
                        }.jpg" --frame ${i} +Ww ${windowCenter} ${windowWidth}`;
                    } else {
                        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg "${dicomFile}" "${jpegFile}.${
                            i - 1
                        }.jpg" --frame ${i}`;
                    }
                } else if (process.env.ENV == "linux") {
                    if (windowCenter && windowWidth) {
                        execCmd = `dcmj2pnm --write-jpeg "${dicomFile}" "${jpegFile}.${
                            i - 1
                        }.jpg" --frame ${i} +Ww ${windowCenter} ${windowWidth}`;
                    } else {
                        execCmd = `dcmj2pnm --write-jpeg "${dicomFile}" "${jpegFile}.${
                            i - 1
                        }.jpg" --frame ${i}`;
                    }
                }
                execCmdList.push(execCmd);
                if (i % 4 === 0) {
                    await Promise.allSettled(
                        execCmdList.map((cmd) => dcm2jpegCustomCmd(cmd))
                    );
                    execCmdList = new Array();
                }
            }
        } else {
            for (let i = 1; i <= frameNumber; i++) {
                await getJpeg[process.env.ENV].getJpegByPydicom(dicomFile, i);
            }
        }
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: true,
            message: "generated",
            finishedTime: new Date()
        });
    } catch (e) {
        await insertDicomToJpegTask({
            studyUID: studyUID,
            seriesUID: seriesUID,
            instanceUID: instanceUID,
            status: false,
            message: e.toString(),
            finishedTime: new Date()
        });
        console.error(e);
        throw e;
    }
}

/**
 * @typedef convertDICOMFileToJSONModuleReturnObject
 * @property {Boolean} status
 * @property {string} storePath
 * @property {string} storeFullPath
 * @property {Object} dicomJson
 */

/**
 *
 * @param {string} filename
 * @return {Promise<convertDICOMFileToJSONModuleReturnObject>}
 */
async function convertDICOMFileToJSONModule(filename) {
    try {
        let dicomJson = await dcm2jsonV8.exec(filename);
        flat(dicomJson);
        let bigValueTags = ["52009230", "00480200"];
        let tempBigTagValue = {};
        for (let bigValueTag of bigValueTags) {
            let bigValue = _.get(dicomJson, bigValueTag);
            if (bigValue) {
                _.set(tempBigTagValue, `${bigValueTag}`, _.cloneDeep(bigValue));
            } else {
                _.set(tempBigTagValue, `${bigValueTag}`, undefined);
            }
            bigValue = undefined;
        }
        dicomJson = _.omit(dicomJson, bigValueTags);
        dicomJson = await replaceBinaryData(dicomJson);
        let startedDate = "";
        startedDate =
            dcm2jsonV8.dcmString(dicomJson, "00080020") +
            dcm2jsonV8.dcmString(dicomJson, "00080030");
        if (!startedDate) startedDate = moment().toISOString();
        else startedDate = moment(startedDate, "YYYYMMDDhhmmss").toISOString();
        let startedDateSplit = startedDate.split("-");
        let year = startedDateSplit[0];
        let month = startedDateSplit[1];
        let uid = dcm2jsonV8.dcmString(dicomJson, "0020000E");
        let shortUID = sh.unique(uid);
        let relativeStorePath = `files/${year}/${month}/${shortUID}/`;
        let fullStorePath = path.join(
            process.env.DICOM_STORE_ROOTPATH,
            relativeStorePath
        );
        let instanceUID = dcm2jsonV8.dcmString(dicomJson, "00080018");
        let metadataFullStorePath = path.join(
            fullStorePath,
            `${instanceUID}.metadata.json`
        );

        for (let keys in tempBigTagValue) {
            if (tempBigTagValue[keys]) {
                _.set(dicomJson, keys, tempBigTagValue[keys]);
            }
        }
        mkdirp.sync(fullStorePath, 0o755);
        fs.writeFileSync(
            metadataFullStorePath,
            JSON.stringify(dicomJson, null, 4)
        );
        logger.info(
            `[STOW-RS] [Store metadata of DICOM json to ${metadataFullStorePath}]`
        );
        dicomJson = _.omit(dicomJson, bigValueTags);
        return {
            status: true,
            storePath: relativeStorePath,
            storeFullPath: fullStorePath,
            dicomJson: dicomJson
        };
    } catch (e) {
        console.error(e);
        return {
            status: false,
            storePath: undefined,
            storeFullPath: undefined,
            dicomJson: undefined
        };
    }
}

/**
 *
 * @typedef saveDICOMFileReturnObject
 * @property {Boolean} status
 * @property {string} storeFullPath
 * @property {Object} error
 */

/**
 *
 * @param {string} tempFilename
 * @param {string} filename
 * @param {string} dest
 * @return {Promise<saveDICOMFileReturnObject>}
 */
async function saveDICOMFile(tempFilename, filename, dest) {
    try {
        await fileFunc.mkdir_Not_Exist(dest);
        let destWithFilename = path.join(dest, filename);
        logger.info(
            `[STOW-RS] [Move uploaded temp file ${tempFilename} to ${destWithFilename}]`
        );
        await moveFile(tempFilename, destWithFilename, {
            overwrite: true
        });
        return {
            status: true,
            error: undefined,
            storeFullPath: destWithFilename
        };
    } catch (e) {
        console.error(e);
        return {
            status: false,
            storeFullPath: undefined,
            error: e
        };
    }
}

async function replaceBinaryData(data) {
    try {
        let binaryKeys = [];
        let flatDicomJson = flat(data);
        for (let key in flatDicomJson) {
            if (key.includes("7FE00010")) continue;
            if (flatDicomJson[key] == "OW" || flatDicomJson[key] == "OB") {
                binaryKeys.push(key.substring(0, key.lastIndexOf(".vr")));
            }
        }
        let port = process.env.DICOMWEB_PORT || "";
        port = port ? `:${port}` : "";
        for (let key of binaryKeys) {
            let studyUID = _.get(data, `0020000D.Value.0`);
            let seriesUID = _.get(data, `0020000E.Value.0`);
            let instanceUID = _.get(data, `00080018.Value.0`);
            let binaryData = "";
            let binaryValuePath = "";
            let shortInstanceUID = sh.unique(instanceUID);
            let relativeFilename = `files/bulkData/${shortInstanceUID}/`;
            if (_.get(data, `${key}.Value.0`)) {
                binaryValuePath = `${key}.Value.0`;
                binaryData = _.get(data, binaryValuePath);
                data = _.omit(data, [`${key}.Value`]);
                _.set(
                    data,
                    `${key}.BulkDataURI`,
                    `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/bulkdata/${binaryValuePath}`
                );
                relativeFilename += `${binaryValuePath}.raw`;
            } else if (_.get(data, `${key}.InlineBinary`)) {
                binaryValuePath = `${key}.InlineBinary`;
                binaryData = _.get(data, `${binaryValuePath}`);
                data = _.omit(data, [`${binaryValuePath}`]);
                _.set(
                    data,
                    `${key}.BulkDataURI`,
                    `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/bulkdata/${binaryValuePath}`
                );
                relativeFilename += `${binaryValuePath}.raw`;
            }

            let filename = path.join(
                process.env.DICOM_STORE_ROOTPATH,
                relativeFilename
            );
            mkdirp.sync(
                path.join(
                    process.env.DICOM_STORE_ROOTPATH,
                    `files/bulkData/${shortInstanceUID}`
                )
            );
            logger.info(`[STOW-RS] [Store binary data to ${filename}]`);
            fs.writeFileSync(filename, Buffer.from(binaryData, "base64"));
            let bulkData = {
                studyUID: studyUID,
                seriesUID: seriesUID,
                instanceUID: instanceUID,
                filename: relativeFilename,
                binaryValuePath: binaryValuePath
            };

            await mongodb["dicomBulkData"].updateOne(
                {
                    $and: [
                        {
                            instanceUID: instanceUID
                        },
                        {
                            binaryValuePath: binaryValuePath
                        }
                    ]
                },
                bulkData,
                {
                    upsert: true
                }
            );
        }
        data["7FE00010"] = {
            vr: "OW",
            BulkDataURI: `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${data["0020000D"].Value[0]}/series/${data["0020000E"].Value[0]}/instances/${data["00080018"].Value[0]}`
        };
        return data;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

function insertMetadata(metadata) {
    return new Promise(async (resolve) => {
        try {
            await mongodb.dicomMetadata.updateOne(
                {
                    $and: [
                        {
                            studyUID: metadata.studyUID
                        },
                        {
                            seriesUID: metadata.seriesUID
                        },
                        {
                            instanceUID: metadata.instanceUID
                        }
                    ]
                },
                metadata,
                {
                    upsert: true
                }
            );
            return resolve(true);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
}

async function insertDicomToJpegTask(item) {
    return new Promise(async (resolve) => {
        try {
            await mongodb.dicomToJpegTask.updateOne(
                {
                    studyUID: item.studyUID,
                    seriesUID: item.seriesUID,
                    instanceUID: item.instanceUID
                },
                item,
                {
                    upsert: true
                }
            );
            resolve(true);
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    });
}

async function getFHIRIntegrateDICOMJson(dicomJson, filename, fhirData) {
    try {
        let isNeedParsePatient = process.env.FHIR_NEED_PARSE_PATIENT == "true";
        let endPoint = dcm2EndpointFromImagingStudy(fhirData);
        await dicomEndpoint2MongoDB(endPoint);
        if (isNeedParsePatient) {
            await dicomPatient2MongoDB(dicomJson);
        }
        fhirData.endpoint = [
            {
                reference: `Endpoint/${endPoint.id}`,
                type: "Endpoint"
            }
        ];
        delete dicomJson["7fe00010"];
        let jpegFile = filename.replace(/\.dcm/gi, "");
        let sopClass = dcm2jsonV8.dcmString(dicomJson, "00080016");
        if (!notImageSOPClass.includes(sopClass)) {
            generateJpeg(dicomJson, filename, jpegFile);
        }

        let qidoLevelKeys = Object.keys(qidoRetAtt);
        let qidoAtt = _.cloneDeep(qidoRetAtt);
        for (let i = 0; i < qidoLevelKeys.length; i++) {
            let levelTags = Object.keys(qidoRetAtt[qidoLevelKeys[i]]);
            for (let x = 0; x < levelTags.length; x++) {
                let nowLevelKeyItem = qidoAtt[qidoLevelKeys[i]];
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

        let port = process.env.DICOMWEB_PORT || "";
        port = port ? `:${port}` : "";
        qidoAtt.study["00081190"] = {
            vr: "UT",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}`
            ]
        };
        fhirData["dicomJson"] = qidoAtt.study;
        qidoAtt.series["00081190"] = {
            vr: "UT",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}`
            ]
        };
        fhirData.series[0].dicomJson = qidoAtt.series;
        qidoAtt.instance["00081190"] = {
            vr: "UT",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}/instances/${qidoAtt.instance["00080018"].Value[0]}`
            ]
        };
        fhirData.series[0].instance[0].dicomJson = qidoAtt.instance;
        dicomJson["7FE00010"] = {
            vr: "OW",
            BulkDataURI: `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}/instances/${qidoAtt.instance["00080018"].Value[0]}`
        };

        //fhirData.series[0].instance[0].metadata = dicomJson;
        for (let i in fhirData.dicomJson["00080020"].Value) {
            fhirData.dicomJson["00080020"].Value[i] = moment(
                fhirData.dicomJson["00080020"].Value[i],
                "YYYYMMDD"
            ).toDate();
        }
        let metadata = _.cloneDeep(dicomJson);
        _.set(metadata, "studyUID", metadata["0020000D"].Value[0]);
        _.set(metadata, "seriesUID", metadata["0020000E"].Value[0]);
        _.set(metadata, "instanceUID", metadata["00080018"].Value[0]);
        await insertMetadata(metadata);
        return fhirData;
    } catch (e) {
        console.error(e);
        return false;
    }
}
/* Failure Reason
http://dicom.nema.org/medical/dicom/current/output/chtml/part02/sect_J.4.2.html
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
    };
    return result;
}

function checkIsSameStudyId(req, dicomJson) {
    let inputID = req.params.studyID;
    let dataStudyID = dcm2jsonV8.dcmString(dicomJson, "0020000D");
    return inputID == dataStudyID;
}

module.exports = async (req, res) => {
    //store the successFiles;
    let successFiles = [];
    let successFHIR = [];
    let stowMessage = {
        "00081190": {
            //Study retrive URL
            vr: "UT",
            Value: []
        },
        "00081198": {
            //Failed SOP Sequence
            vr: "SQ",
            Value: [] // Use SOPSeq
        },
        "00081199": {
            //ReferencedSOPSequence
            vr: "SQ",
            Value: [] // Use SOPSeq
        }
    };
    let retCode = 200;
    let startSTOWTime = performance.now();

    new formidable.IncomingForm({
        uploadDir: path.join(process.cwd(), "/temp"),
        maxFileSize: 100 * 1024 * 1024 * 1024,
        multiples: true,
        isGetBoundaryInData: true
    }).parse(req, async (err, fields, files) => {
        if (err) {
            logger.error(err);
            return sendServerWrongMessage(res, err);
        } else {
            let fileField = Object.keys(files).pop();
            let uploadedFiles = files[fileField];
            if (!_.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];
            //main-process
            try {
                //if env FHIR_NEED_PARSE_PATIENT is true then post the patient data
                for (let i = 0; i < uploadedFiles.length; i++) {
                    if (!uploadedFiles[i].name) {
                        uploadedFiles[i].name = `${uuid.v4()}.dcm`;
                        logger.info(
                            `[STOW-RS] [Cannot find filename, name the file to ${uploadedFiles[i].name}]`
                        );
                    }
                    //1. convert DICOM to JSON
                    let dicomToJsonResponse =
                        await convertDICOMFileToJSONModule(
                            uploadedFiles[i].path
                        );
                    if (!dicomToJsonResponse.status) {
                        return sendServerWrongMessage(
                            res,
                            `The server have exception with file:${
                                uploadedFiles[i].name
                            } , error : can not convert DICOM to JSON Module, success Files: ${JSON.stringify(
                                successFiles,
                                null,
                                4
                            )}`
                        );
                    }

                    let sopClass = dcm2jsonV8.dcmString(
                        dicomToJsonResponse.dicomJson,
                        "00080016"
                    );
                    let sopInstanceUID = dcm2jsonV8.dcmString(
                        dicomToJsonResponse.dicomJson,
                        "00080018"
                    );
                    let sopSeq = getSOPSeq(sopClass, sopInstanceUID);
                    if (req.params.studyID) {
                        if (
                            !checkIsSameStudyId(
                                req,
                                dicomToJsonResponse.dicomJson
                            )
                        ) {
                            logger.error(
                                `[STOW-RS] [The UID is not consist, request UID: (${req.params.studyID})]`
                            );
                            let failureMessage = {
                                "00081197": {
                                    vr: "US",
                                    Value: ["A900"]
                                }
                            };
                            Object.assign(sopSeq, failureMessage);
                            stowMessage["00081198"].Value.push(sopSeq);
                            retCode = 409;
                            continue;
                        }
                    }
                    //2. if not conflict study UID or no exception when convert to DICOM
                    //then save DICOM file
                    let storedDICOMObject = await saveDICOMFile(
                        uploadedFiles[i].path,
                        uploadedFiles[i].name,
                        dicomToJsonResponse.storeFullPath
                    );
                    if (storedDICOMObject.status) {
                        //3. Convert DICOM to FHIR ImagingStudy
                        let fhirImagingStudyData =
                            await fhirImagingStudyModel.DCMJson2FHIR(
                                dicomToJsonResponse.dicomJson
                            );
                        if (!fhirImagingStudyData) {
                            return sendServerWrongMessage(
                                res,
                                `The server have exception with file:${uploadedFiles[i].name} , error : can not convert DICOM to FHIR ImagingStudy`
                            );
                        }
                        let fhirDICOM = await getFHIRIntegrateDICOMJson(
                            dicomToJsonResponse.dicomJson,
                            storedDICOMObject.storeFullPath,
                            fhirImagingStudyData
                        );
                        if (!fhirDICOM) {
                            return sendServerWrongMessage(
                                res,
                                `The server have exception with file:${uploadedFiles[i].name} , error : can not integrate FHIR with DICOM JSON`
                            );
                        }

                        fhirDICOM.series[0].instance[0].store_path = path.join(
                            dicomToJsonResponse.storePath,
                            uploadedFiles[i].name
                        );

                        let port = process.env.DICOMWEB_PORT || "";
                        port = port ? `:${port}` : "";
                        stowMessage["00081190"].Value.push(
                            ...fhirDICOM.dicomJson["00081190"].Value
                        );
                        stowMessage["00081190"].Value = _.uniq(
                            stowMessage["00081190"].Value
                        );
                        let retriveInstanceUrl = {
                            "00081190":
                                fhirDICOM.series[0].instance[0].dicomJson[
                                    "00081190"
                                ]
                        };
                        Object.assign(sopSeq, retriveInstanceUrl);
                        stowMessage["00081199"]["Value"].push(sopSeq);
                        let fhirMerge = await dicom2FHIR(fhirDICOM);

                        if (!fhirMerge) {
                            return sendServerWrongMessage(
                                res,
                                `The server have exception with file:${uploadedFiles[i].name} , error : can not store FHIR ImagingStudy object to database`
                            );
                        }
                        
                        let storeToMongoDBStatus = await dicom2mongodb(
                            fhirMerge
                        );
                        if (!storeToMongoDBStatus) {
                            return sendServerWrongMessage(
                                res,
                                `The server have exception with file:${uploadedFiles[i].name} , error : can not store object to database`
                            );
                        }
                        updateModalitiesInStudy(dicomToJsonResponse.dicomJson);
                        let baseFileName = path.basename(uploadedFiles[i].name);
                        successFHIR.push(baseFileName);
                        successFiles.push(baseFileName);
                    } else {
                        return sendServerWrongMessage(
                            res,
                            `The server have exception with file:${
                                uploadedFiles[i].name
                            } , error : ${storedDICOMObject.error.toString()}`
                        );
                    }
                }
                res.header("Content-Type", "application/json");
                let resMessage = {
                    result: successFiles,
                    successFHIR: successFHIR
                };
                Object.assign(resMessage, stowMessage);
                let endSTOWTime = performance.now();
                let elapsedTime = (endSTOWTime - startSTOWTime).toFixed(3);
                logger.info(
                    `[STOW-RS] [Finished STOW-RS, elapsed time: ${elapsedTime} ms]`
                );
                return res.status(retCode).send(resMessage);
            } catch (err) {
                let errMsg = err.message || err;
                console.error('/dicom-web/studies "STOW Api" err, ', errMsg);
                console.log(successFiles);
                return res.status(500).send(errMsg);
            }
        }
    });
};

module.exports.stowWithoutRoute = async (filename) => {
    try {
        let dicomToJsonResponse = await convertDICOMFileToJSONModule(filename);
        if (!dicomToJsonResponse.status) {
            console.error(
                `The server have exception with file:${filename} , error : can not convert DICOM to JSON Module`
            );
            return false;
        }

        let storedDICOMObject = await saveDICOMFile(
            filename,
            path.basename(filename),
            dicomToJsonResponse.storeFullPath
        );
        if (storedDICOMObject.status) {
            let fhirImagingStudyData =
                await fhirImagingStudyModel.DCMJson2FHIR(
                    dicomToJsonResponse.dicomJson
                );
            if (!fhirImagingStudyData) {
                console.error(
                    `The server have exception with file:${filename} , error : can not convert DICOM to FHIR ImagingStudy`
                );
                return false;
            }
            let fhirDICOM = await getFHIRIntegrateDICOMJson(
                dicomToJsonResponse.dicomJson,
                storedDICOMObject.storeFullPath,
                fhirImagingStudyData
            );
            if (!fhirDICOM) {
                console.error(
                    `The server have exception with file:${filename} , error : can not integrate FHIR with DICOM JSON`
                );
                return false;
            }
            fhirDICOM.series[0].instance[0].store_path = path.join(
                dicomToJsonResponse.storePath,
                path.basename(filename)
            );

            let fhirMerge = await dicom2FHIR(fhirDICOM);
            if (!fhirMerge) {
                console.error(
                    `The server have exception with file:${filename} , error : can not store FHIR ImagingStudy object to database`
                );
                return false;
            }

            let storeToMongoDBStatus = await dicom2mongodb(fhirMerge);
            if (!storeToMongoDBStatus) {
                console.error(
                    `The server have exception with file:${filename} , error : can not store object to database`
                );
                return false;
            }
            return true;
        } else {
            console.error(
                `The server have exception with file:${filename} , error : can not convert DICOM to JSON Module`
            );
            return false;
        }
    } catch (err) {
        let errMsg = err.message || err;
        console.log('/dicom-web/studies "STOW Api" err, ', errMsg);
        return false;
    }
};

async function updateModalitiesInStudy(dicomJson) {
    let modalitiesInStudyDoc = await mongodb.dicomMetadata.aggregate([
        {
            $match: {
                studyUID: dicomJson["0020000D"].Value[0]
            }
        },
        {
            $unwind: "$00080060.Value"
        },
        {
            $group: {
                _id: "$studyUID",
                modalitiesInStudy: {
                    $addToSet: "$00080060.Value"
                }
            }
        }
    ]);
    if (modalitiesInStudyDoc.length > 0) {
        let modalitiesInStudy = {
            vr: "CS",
            Value: [...modalitiesInStudyDoc[0].modalitiesInStudy]
        };
        _.set(dicomJson, "00080061", modalitiesInStudy);
        let modalitiesCodingList = [];
        for (let i = 0; i < modalitiesInStudy.Value.length; i++) {
            let modalityCoding = {
                system: "http://dicom.nema.org/resources/ontology/DCM",
                code: modalitiesInStudy.Value[i]
            };
            modalitiesCodingList.push(modalityCoding);
        }
        await mongodb.ImagingStudy.findOneAndUpdate(
            {
                "dicomJson.0020000D.Value": dicomJson["0020000D"].Value[0]
            },
            {
                $set: {
                    "dicomJson.00080061": dicomJson["00080061"],
                    modality: modalitiesCodingList
                }
            }
        );
    }
}
