const path = require("path");
const fs = require("fs");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const fhirImagingStudyModel = require("../../../../models/FHIR/DICOM2FHIRImagingStudy");
const {
    dcm2EndpointFromImagingStudy
} = require("../../../../models/FHIR/DICOM2Endpoint");
const dcm2Patient = require("../../../../models/FHIR/DICOM2FHIRPatient");
const sh = require("shorthash");
const { qidoRetAtt } = require("../../../../models/FHIR/dicom-tag"); // eslint-disable-line @typescript-eslint/naming-convention
const {
    dcm2jpegCustomCmd,
    dcm2jsonV8,
    dcmtkSupportTransferSyntax
} = require("../../../../models/dcmtk");
const moment = require("moment");
const {
    sendServerWrongMessage
} = require("../../../../models/DICOMWeb/httpMessage");
const moveFile = require("move-file");
const uuid = require("uuid");
const { getJpeg } = require("../../../../models/python");
const mongodb = require("../../../../models/mongodb");
const {
    pushOrNewInstanceImagingStudy
} = require("../../../FHIR/ImagingStudy/controller/post_convertFHIR");
const mkdirp = require("mkdirp");
const notImageSOPClass = require("../../../../models/DICOMWeb/notImageSOPClass");
const { logger } = require("../../../../utils/log");
const jsonPath = require("jsonpath");
const {
    updateImagingStudy
} = require("../../../FHIR/ImagingStudy/controller/putImagingStudy");

/**
 *
 * @param {object} dicomJson
 * @returns {import("../../../../utils/typeDef/stow").UidObj}
 */
function getUidObj(dicomJson) {
    let studyUID = _.get(dicomJson, `0020000D.Value.0`);
    let seriesUID = _.get(dicomJson, `0020000E.Value.0`);
    let instanceUID = _.get(dicomJson, `00080018.Value.0`);
    let sopClass = _.get(dicomJson, `00080016.Value.0`);
    return {
        studyUID: studyUID,
        seriesUID: seriesUID,
        instanceUID: instanceUID,
        sopClass: sopClass
    };
}

/**
 * @param {import("express").Request} req
 * @param {import("../../../../utils/typeDef/stow").UidObj} uidObj
 * @return {import("../../../../utils/typeDef/stow").RetrieveUrlObj}
 */
function getRetrieveUrlObj(req, uidObj) {
    let { studyUID, seriesUID, instanceUID } = uidObj;
    return {
        studyRetrieveUrl: `http://${req.headers.host}/${process.env.DICOMWEB_API}/studies/${studyUID}`,
        seriesRetrieveUrl: `http://${req.headers.host}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}`,
        instanceRetrieveUrl: `http://${req.headers.host}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`
    };
}

function getBinaryDataTags(dicomJson) {
    let binaryDataTags = [];
    let binaryNodes = jsonPath.nodes(
        dicomJson,
        `$..[?(@.vr === "OW" || @.vr === "OB")]`
    );
    for (let node of binaryNodes) {
        node.path.shift();
        let binaryDataTag = node.path.join(".");
        binaryDataTags.push(binaryDataTag);
    }
    return binaryDataTags;
}

/**
 *
 * @param {import("express").Request} req
 * @param {Object} dicomJson
 */
async function storeBinaryDataAndReplaceToUri(req, uidObj, dicomJson) {
    let { studyUID, seriesUID, instanceUID } = uidObj;
    let shortInstanceUID = sh.unique(instanceUID);

    // Set pixel data to WADO-RS URL
    dicomJson["7FE00010"] = {
        vr: "UR",
        BulkDataURI: `http://${req.headers.host}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`
    };

    let binaryDataTags = getBinaryDataTags(dicomJson);
    for (let tag of binaryDataTags) {
        let binaryData = "";
        let binaryValuePath = "";

        let relativeFilename = `files/bulkData/${shortInstanceUID}/`;

        // Replace binary data to URI
        if (_.get(dicomJson, `${tag}.Value.0`)) {
            binaryValuePath = `${tag}.Value.0`;
        } else if (_.get(dicomJson, `${tag}.InlineBinary`)) {
            binaryValuePath = `${tag}.InlineBinary`;
        }

        binaryData = _.get(dicomJson, binaryValuePath);
        dicomJson = _.omit(dicomJson, [`${tag}.Value`]);
        _.set(
            dicomJson,
            `${tag}.BulkDataURI`,
            `http://${req.headers.host}/${process.env.DICOMWEB_API}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/bulkdata/${binaryValuePath}`
        );
        relativeFilename += `${binaryValuePath}.raw`;

        // Write the binary data to disk
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

        // Store binary data to mongodb
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
}

/**
 * @typedef DicomJsonAndBigTags
 * @property {Object} dicomJson
 * @property {Object} tempBigTagValue
 */

/**
 *
 * @param {Object} dicomJson
 */
function detachBigValuesDicomJson(dicomJson) {
    // Temp the tags that may have big complex structure
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

    return {
        dicomJson: dicomJson,
        tempBigTagValue: tempBigTagValue
    };
}

/**
 *
 * @param {Object} dicomJson
 */
function getStoreDest(dicomJson) {
    let started_date = "";
    started_date =
        dcm2jsonV8.dcmString(dicomJson, "00080020") +
        dcm2jsonV8.dcmString(dicomJson, "00080030");
    if (!started_date) started_date = Date.now();
    started_date = moment(started_date, "YYYYMMDDhhmmss").toISOString();
    let started_date_split = started_date.split("-");
    let year = started_date_split[0];
    let month = started_date_split[1];
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

    return {
        relativeStorePath: relativeStorePath,
        fullStorePath: fullStorePath,
        metadataFullStorePath: metadataFullStorePath
    };
}

/**
 *
 * @param {DicomJsonAndBigTags} dicomJsonAndBigTags
 */
function storeMetadataToDisk(dicomJsonAndBigTags, storePath) {
    let cloneDicomJson = _.cloneDeep(dicomJsonAndBigTags.dicomJson);
    for (let keys in dicomJsonAndBigTags.tempBigTagValue) {
        if (dicomJsonAndBigTags.tempBigTagValue[keys]) {
            _.set(
                cloneDicomJson,
                keys,
                dicomJsonAndBigTags.tempBigTagValue[keys]
            );
        }
    }
    fs.writeFileSync(storePath, JSON.stringify(cloneDicomJson, null, 4));
    logger.info(`[STOW-RS] [Store metadata of DICOM json to ${storePath}]`);
}

function checkIsSameStudyId(req, dicomJson) {
    let inputID = req.params.studyID;
    let dataStudyID = dcm2jsonV8.dcmString(dicomJson, "0020000D");
    return inputID == dataStudyID;
}

/**
 *
 * @param {string} tempFilename The temporary upload file
 * @param {string} filename The original filename of upload file
 * @param {*} dest Destination for Storing file
 * @returns
 */
async function saveDICOMFile(tempFilename, filename, dest) {
    try {
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

/**
 *
 * @param {Object} dicomJson
 * @param {string} filename
 * @param {Object} fhirData
 * @returns
 */
async function mergeDicomJsonAndFhirImagingStudy(
    dicomJson,
    filename,
    fhirData
) {
    try {
        fhirData.endpoint = [
            {
                reference: `Endpoint/${uuid.v4()}`,
                type: "Endpoint"
            }
        ];

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
            vr: "UR",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}`
            ]
        };
        fhirData["dicomJson"] = qidoAtt.study;
        qidoAtt.series["00081190"] = {
            vr: "UR",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}`
            ]
        };
        fhirData.series[0].dicomJson = qidoAtt.series;
        qidoAtt.instance["00081190"] = {
            vr: "UR",
            Value: [
                `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}/instances/${qidoAtt.instance["00080018"].Value[0]}`
            ]
        };
        fhirData.series[0].instance[0].dicomJson = qidoAtt.instance;
        dicomJson["7FE00010"] = {
            vr: "UR",
            BulkDataURI: `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${qidoAtt.study["0020000D"].Value[0]}/series/${qidoAtt.series["0020000E"].Value[0]}/instances/${qidoAtt.instance["00080018"].Value[0]}`
        };

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

async function generateJpeg(dicomJson, dicomFile, uidObj) {
    let sopClass = dcm2jsonV8.dcmString(dicomJson, "00080016");
    if (notImageSOPClass.includes(sopClass)) {
        return;
    }

    let jpegFile = dicomFile.replace(/\.dcm/gi, "");
    let { studyUID, seriesUID, instanceUID } = uidObj;
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
 * * 1. convert DICOM to JSON
 * * 2. if not conflict study UID or no exception when convert to DICOM then save DICOM file
 * * 3. Convert DICOM to FHIR ImagingStudy
 * * 4. Merge DICOM JSON and FHIR imagingStudy
 * * 5. Get merge imagingStudy with Push or create new instance of FHIR imagingStudy from mongodb
 * * 6. Update FHIR endpoint, patient, imagingStudy in mongodb
 * * 7. Calc all modalitiesInStudy and update to mongodb
 * @param {import("express").Request} req
 * @param {string} filename The temporary uploaded file's filename
 * @param {string} originalFilename The original file's filename of upload file
 */
async function stow(req, filename, originalFilename) {
    //* 1. convert DICOM to JSON
    // Check DICOM file can convert to JSON
    let dicomJson;
    try {
        dicomJson = await dcm2jsonV8.exec(filename);
    } catch (e) {
        console.error(e);
        return {
            isFailure: true,
            statusCode: 273,
            message: "Could not convert DICOM to JSON",
            httpStatusCode: 400
        };
    }
    try {
        let dicomJsonAndBigTags = detachBigValuesDicomJson(dicomJson);
        let uidObj = getUidObj(dicomJson);
        let retrieveUrlObj = getRetrieveUrlObj(req, uidObj);
        
        // Check upload DICOM file's Study Instance UID same to request params
        if (_.get(req.params, "studyID", "")) {
            if (!checkIsSameStudyId(req, dicomJsonAndBigTags.dicomJson)) {
                logger.error(
                    `[STOW-RS] [The UID is not consist, request UID: (${req.params.studyID})]`
                );
                return {
                    isFailure: true,
                    statusCode: 43264,
                    message: "Study Instance UID mismatch",
                    uidObj: uidObj,
                    retrieveUrlObj: retrieveUrlObj,
                    httpStatusCode: 409
                };
            }
        }

        await storeBinaryDataAndReplaceToUri(
            req,
            uidObj,
            dicomJsonAndBigTags.dicomJson
        );

        let { relativeStorePath, fullStorePath, metadataFullStorePath } =
            getStoreDest(dicomJsonAndBigTags.dicomJson);
        mkdirp.sync(fullStorePath, 0755);
        storeMetadataToDisk(dicomJsonAndBigTags, metadataFullStorePath);


        // 2. if not conflict study UID or no exception when convert to DICOM then save DICOM file
        let storedDICOMObject = await saveDICOMFile(
            filename,
            originalFilename,
            fullStorePath
        );
        if (!storedDICOMObject.status) {
            console.error(`Can not save DICOM file ${JSON.stringify(uidObj)}`);
            return {
                isFailure: true,
                statusCode: 272,
                message: "Can not save DICOM file",
                uidObj: uidObj,
                retrieveUrlObj: retrieveUrlObj,
                httpStatusCode: 500
            };
        }

        // Pre-Process for generating Jpeg of DICOM first
        // Many useful for WSI
        let dicomFilename = path.join(fullStorePath, originalFilename);
        generateJpeg(dicomJsonAndBigTags.dicomJson, dicomFilename, uidObj);

        //* 3. Convert DICOM to FHIR ImagingStudy
        let fhirImagingStudyData = await fhirImagingStudyModel.DCMJson2FHIR(
            dicomJsonAndBigTags.dicomJson
        );
        if (!fhirImagingStudyData) {
            console.error(
                `Can not convert DICOM file to FHIR imagingStudy ${JSON.stringify(
                    uidObj
                )}`
            );
            return {
                isFailure: true,
                statusCode: 272,
                message: "Can not convert DICOM file to FHIR imagingStudy",
                uidObj: uidObj,
                retrieveUrlObj: retrieveUrlObj,
                httpStatusCode: 500
            };
        }

        //* 4. Merge DICOM JSON and FHIR imagingStudy
        let fhirDICOM = await mergeDicomJsonAndFhirImagingStudy(
            dicomJsonAndBigTags.dicomJson,
            dicomFilename,
            fhirImagingStudyData
        );
        if (!fhirDICOM) {
            console.error(
                `Can not merge DICOM json and FHIR imagingStudy ${JSON.stringify(
                    uidObj
                )}`
            );
            return {
                isFailure: true,
                statusCode: 272,
                message: "Can not merge DICOM json and FHIR imagingStudy",
                uidObj: uidObj,
                retrieveUrlObj: retrieveUrlObj,
                httpStatusCode: 500
            };
        }
        fhirDICOM.series[0].instance[0].store_path = path.join(
            relativeStorePath,
            originalFilename
        );

        //* 5. Push or create new instance of FHIR imagingStudy from mongodb
        // Return new merged imagingStudy with exist data
        let imagingStudyMergeResult = await pushOrNewInstanceImagingStudy(
            fhirDICOM,
            fhirDICOM.id
        );
        if (!imagingStudyMergeResult.status) {
            return {
                isFailure: true,
                statusCode: 272,
                message: `Can not merge imagingStudy into existing imagingStudy in mongodb, ${JSON.stringify(
                    uidObj
                )}`,
                uidObj: uidObj,
                retrieveUrlObj: retrieveUrlObj,
                httpStatusCode: 500
            };
        }
        let imagingStudyMergeData = imagingStudyMergeResult.data;

        //* 6. Update FHIR endpoint, patient, imagingStudy in mongodb
        let fhirEndpoint = dcm2EndpointFromImagingStudy(imagingStudyMergeData);
        await dicomEndpoint2MongoDB(fhirEndpoint);

        let fhirPatient = dcm2Patient.dcmJson2Patient(dicomJsonAndBigTags.dicomJson);
        await dicomPatient2MongoDB(fhirPatient);
        
        let updateImagingStudyResult = await updateImagingStudy(
            { id: imagingStudyMergeData.id },
            imagingStudyMergeData
        );
        logger.info(
            `[STOW-RS] [Store ImagingStudy, ID: ${imagingStudyMergeData.id}]`
        );
        if (!updateImagingStudyResult.status) {
            return sendServerWrongMessage(
                res,
                `The server have exception with file:${uploadedFiles[i].name} , error : can not store object to database`
            );
        }

        //* 7. Calc all modalitiesInStudy and update to mongodb
        updateModalitiesInStudy(dicomJsonAndBigTags.dicomJson);

        return {
            isFailure: false,
            statusCode: 0,
            message: `Store DICOM instance successful`,
            uidObj: uidObj,
            retrieveUrlObj: retrieveUrlObj,
            httpStatusCode: 200
        };
    } catch (e) {
        console.error(e);
        return {
            isFailure: true,
            statusCode: 272,
            message: `${e}, ${JSON.stringify(uidObj)}`,
            uidObj: uidObj,
            httpStatusCode: 500
        };
    }
}
const request = require("request");
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

module.exports.stow = stow;
