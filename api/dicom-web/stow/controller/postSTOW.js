'use strict';
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const request = require('request');
const FHIR_Imagingstudy_model = require("../../../../models/FHIR/DICOM2FHIRImagingStudy");
const {DCM2Endpoint_imagingStudy} = require("../../../../models/FHIR/DICOM2Endpoint");
const toArray = require('stream-to-array');
const sh = require('shorthash');
const fileFunc = require('../../../../models/file/file_Func');
const ReadableStreamClone = require("readable-stream-clone");
const {QIDORetAtt}  =require('../../../../models/FHIR/dicom-tag');
const DCM2Patient = require('../../../../models/FHIR/DICOM2FHIRPatient');
const stream = require('stream');
const _ = require('lodash');
const {dcm2json} = require('models/dcmtk');
const moment = require('moment');

const uploadDicom = (req) => {
    console.log('====================');
    return new Promise(async (resolve, reject) => {
        if (req.headers["content-type"].match(/multipart\/related.*/)) {
            let contentTypeSplit = req.headers["content-type"].split("type=");
            let contentType = contentTypeSplit[contentTypeSplit.length-1];

            let result = await stowMultipartRelated(req);
            return resolve(result);
        }
        try {
            const busboy = new Busboy({
                headers: req.headers
            });
            let files = {};
            files.filename =  [];
            files.files = [];
            let filelength = 0;
            busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
                console.log('Field [' + fieldname + ']: value: ' + val);
            });
    
            busboy.on('file', async function (fieldname, file, filename, encoding, mimetype) {
                filelength++;
                files.files.push(new ReadableStreamClone(file));
                files.filename.push(filename);
                files.encoding = encoding;
                files.mimeType = mimetype;
                file.resume();
                file.on('end', async function() {
                    --filelength;
                    if(filelength == 0) {
                        console.log('Upload complete');
                        resolve(files);
                    }
                });
            });
            busboy.on('finish', function () {
                console.log('Upload complete finish');
                resolve(files);
            });
            busboy.on('error', function (err) {
                reject(err);
            });
            return req.pipe(busboy);
        } catch (e) {
            return reject(new Error(e));
        }
        
    });
}

function bufferToStream(buffer) { 
    let readstream = new stream.Readable();
    readstream.push(buffer);
    readstream.push(null);
    return readstream;
}
async function stowMultipartRelated(req) {
    req.body= req.body.toString('binary');
    let multipartMessage = req.body;
    //let boundary = req.headers["content-type"].split("boundary=")[1];
    let boundary = req.body.split("\r\n")[0].substring(2);
    let startBoundary = `--${boundary}`;
    let endBoundary = `--${boundary}--`;
    let matches = req.body.matchAll(new RegExp(startBoundary , "gi"));
    let fileEndIndex = [];
    let fileStartIndex = [];
    for (let match of matches) {
        fileEndIndex.push(match.index-2);
    }
    let regex = new RegExp(`Content-Disposition|Content-Type`);
    let data = multipartMessage.split("\r\n");
    let fileLength = 0;
    let file = {
        buffer : [] , 
        text : "" 
    }
    let filename = [];
    let files = [];
    /*for (let i in data) {
        let text = data[i];
        if ((text == startBoundary || text== endBoundary) && file.text) {
            console.log(Buffer.from(file.text , 'binary'));
            files.push(bufferToStream(Buffer.from(file.text , 'binary')));
            file = {
                buffer : [] , 
                text : "" ,
                contentType : "" , 
            contentDisposition : ""
            }
        } else if (text.includes("Content-Disposition")) {
            let textSplitFileName = text.split("filename=")
            filename.push(textSplitFileName[textSplitFileName.length-1].replace(/"/gm , ""));
        } else if (text && !text.match(regex) && text != endBoundary && text != startBoundary) {
            file.text += text;
        } 
    }*/
    let contentDispositionList = [];
    let contentTypeList = [];
    for (let i in data) {
        let text = data[i];
        if (text.includes("Content-Disposition")) {
            contentDispositionList.push(text);
            let textSplitFileName = text.split("filename=")
            filename.push(textSplitFileName[textSplitFileName.length-1].replace(/"/gm , ""));
        } else if (text.includes("Content-Type")) {
            contentTypeList.push(text);
        }
    }
    contentDispositionList = _.uniq(contentDispositionList);
    contentTypeList = _.uniq(contentTypeList);
    for (let type of contentTypeList) {
        let contentTypeMatches = req.body.matchAll(new RegExp(type , "gi"));    for (let match of contentTypeMatches) {
            fileStartIndex.push(match.index +match['0'].length + 4);
        }
    }
    fileEndIndex = fileEndIndex.slice(1);
    for (let i in fileEndIndex) {
        let fileData = req.body.substring(fileStartIndex[i] , fileEndIndex[i]);
        files.push(bufferToStream(Buffer.from(fileData , 'binary')));
    }
    console.log("Upload Files complete");
    return {files : files , filename : filename};
}

async function dicom2mongodb(data) {
    //let test = await FHIR_Imagingstudy_model.DCM2FHIR(dirname);
    return new Promise(async (resolve)=>
    {
       let result = await require('../../../FHIR/ImagingStudy/controller/putImagingStudy').putWithoutReq(data.id , data);
       if (result) return resolve(true);
       return resolve(false);
       
        let options =
        {
            method: "PUT",
            url: `http://${process.env.FHIRSERVER_HOST}:${process.env.SERVER_PORT}/api/fhir/ImagingStudy/${data.id}`,
            json: true,
            body: data
        }
        request(options, function (err, response, body) {
            if (err) {
                return reject(new Error(err));
            }
            resolve(true);
        });
    });
}

async function dicom2FHIR(data) {
    //let test = await FHIR_Imagingstudy_model.DCM2FHIR(dirname);
    return new Promise(async (resolve , reject)=>
    {
        let resData =await require('../../../FHIR/ImagingStudy/controller/post_convertFHIR').getData( data.id , data);
        return resolve(resData);
        let options =
        {
            method: "POST",
            url: `http://${process.env.FHIRSERVER_HOST}:${process.env.SERVER_PORT}/api/fhir/ImagingStudy/convertFHIR/${data.id}`,
            json: true ,
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

async function dicomEndpoint2MongoDB(data) {
    //let test = await FHIR_Imagingstudy_model.DCM2FHIR(dirname);
    return new Promise((resolve , reject)=>
    {
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

async function dicomPatient2MongoDB (data) {
    return new Promise(async (resolve)=> {
        let patient = await DCM2Patient.DCM2Patient(data);
        let Insert_Patient_options = {
            url : `http://${process.env.FHIRSERVER_HOST}:${process.env.SERVER_PORT}/api/fhir/Patient/${patient.id}`,
            method : "PUT",
            json : true,
            body : patient
        }
        request(Insert_Patient_options, function (err, response, body) {
            if (err) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

async function saveDicom (filestream , filename) {
    return new Promise (async (resolve , reject)=>{
        let cloneFile = new ReadableStreamClone(filestream);
        let temp_buffer =await toArray(filestream)
        .then(function (parts) {
            let buffers = []
            for (let i = 0, l = parts.length; i < l ; ++i) {
                let part = parts[i];
                buffers.push((part instanceof Buffer) ? part : Buffer.from(part))
            }
            return Buffer.concat(buffers);
        });
        let fhirData = await FHIR_Imagingstudy_model.DCM2FHIR(temp_buffer);
        if (!fhirData) {
            return resolve(false);
        }
       // let fhirData = fhirDataList[0];
        let started_date = new Date(fhirData.started).toISOString(); 
        let started_date_split = started_date.split('-');
        let year = started_date_split[0];
        let month = started_date_split[1];
        let uid = fhirData.series[0].uid;
        let uuid = sh.unique(uid);
        let new_store_path = `files/${year}/${month}/${uuid}/${filename}`
        fhirData.series[0].instance[0].store_path = new_store_path;
        await fileFunc.mkdir_Not_Exist(process.env.DICOM_STORE_ROOTPATH + new_store_path);
        let ws = fs.createWriteStream(process.env.DICOM_STORE_ROOTPATH + new_store_path)
        cloneFile.pipe(ws);
        
        ws.on("finish" , async function () {
            //let dicomJson = await FHIR_Imagingstudy_model.dicomParser2DicomJson(process.env.DICOM_STORE_ROOTPATH + new_store_path);
            let dicomJson = "";
            try {
                dicomJson = await dcm2json(process.env.DICOM_STORE_ROOTPATH + new_store_path);
            } catch (e) {
                console.error(e);
                return resolve(false);
            }
            delete dicomJson["7fe00010"];
            
            let QIDOLevelKeys = Object.keys(QIDORetAtt);
            let QIDOAtt = Object.assign({}, QIDORetAtt);
            for (let i =  0; i<QIDOLevelKeys.length ; i++) {
                let levelTags = Object.keys (QIDORetAtt[QIDOLevelKeys[i]]);
                for (let x= 0 ; x < levelTags.length ; x++) {
                    let nowLevelKeyItem = QIDOAtt[QIDOLevelKeys[i]];
                    let setValueTag =  levelTags[x];
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
                vr : "UT" , 
                Value : [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}`]
            }
            fhirData['dicomJson'] = QIDOAtt.study;
            QIDOAtt.series['00081190'] = {
                vr : "UT" , 
                Value : [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}`]
            }
            fhirData.series[0].dicomJson = QIDOAtt.series;
            QIDOAtt.instance['00081190'] = {
                vr : "UT" , 
                Value : [`http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}/instances/${QIDOAtt.instance['00080018'].Value[0]}`]
            }
            fhirData.series[0].instance[0].dicomJson = QIDOAtt.instance;
            dicomJson["7FE00010"] = {
                "vr" : "OW" , 
                "BulkDataURI" : `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}/studies/${QIDOAtt.study['0020000D'].Value[0]}/series/${QIDOAtt.series['0020000E'].Value[0]}/instances/${QIDOAtt.instance['00080018'].Value[0]}`
            }
            fhirData.series[0].instance[0].metadata = dicomJson;
            for (let i in fhirData.dicomJson["00080020"].Value) {
                fhirData.dicomJson["00080020"].Value[i] = moment(fhirData.dicomJson["00080020"].Value[i] , "YYYYMMDD").toDate();
            }
            return resolve(fhirData);
        });
        //let dicomJson = await FHIR_Imagingstudy_model.DCM2Json(process.env.DICOM_STORE_ROOTPATH + new_store_path);
        
    });
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
function getSOPSeq (referencedSOPClassUID , referencedSOPInstanceUID) {
    let result = {
        "00081150" : {
            vr : "UI" , 
            Value : [referencedSOPClassUID]
        },
        "00081155" : {
            vr : "UI" , 
            Value : [referencedSOPInstanceUID]
        }
    }
    return result;
}


function checkIsSameStudyId(req ,fhirData) {
    let inputID = req.params.studyID;
    let dataStudyID  = fhirData.identifier[0].value.substring(8);
    return inputID == dataStudyID;
}

module.exports = async (req, res) => {
    //store the successFiles;
    let successFiles = [];
    let successFHIR = [];
    let successFilesStorePath =  [];
    let STOWMessage = {
        "00081190" : {  //Study retrive URL
            "vr" : "UT" , 
            "Value" : []
        } ,
        "00081198" : {  //Failed SOP Sequence
            "vr" : "SQ" , 
            "Value" : [] // Use SOPSeq
        } ,
        "00081199" : { //ReferencedSOPSequence
            "vr" : "SQ" , 
            "Value" : [] // Use SOPSeq
        }
    }
    let retCode =  200;
    try {
        const dicomFile = await uploadDicom(req);
        //if env FHIR_NEED_PARSE_PATIENT is true then post the patient data
        let isNeedParsePatient = process.env.FHIR_NEED_PARSE_PATIENT == "true";
        for (let i = 0 ; i< dicomFile.filename.length ; i++)
        {
            let FHIRData = await saveDicom(dicomFile.files[i] , dicomFile.filename[i]);
            if (!FHIRData) {
                continue;
            }
            
            let sopClass = FHIRData.series[0].instance[0].sopClass.code.substring(8);
            let sopInstanceUID = FHIRData.series[0].instance[0].uid;
            let sopSeq = getSOPSeq(sopClass , sopInstanceUID);
            if (req.params.studyID) {
                if (!checkIsSameStudyId(req , FHIRData)) {
                    let failureMessage = {
                        "00081197" : {
                            vr : "US" , 
                            Value : ["A900"]
                        }
                    }
                    Object.assign(sopSeq , failureMessage);
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
                "00081190" : FHIRData.series[0].instance[0].dicomJson["00081190"]
            }
            Object.assign(sopSeq , retriveInstanceUrl);
            STOWMessage["00081199"]["Value"].push(sopSeq);
            let endPoint = await DCM2Endpoint_imagingStudy(FHIRData);
            await dicomEndpoint2MongoDB(endPoint);
            if (isNeedParsePatient) {
                await dicomPatient2MongoDB(path.join(process.env.DICOM_STORE_ROOTPATH 
                    , FHIRData.series[0].instance[0].store_path));
            }
            FHIRData.endpoint = {
                reference : `Endpoint/${endPoint.id}` ,
                type : "Endpoint"
            }
            let FHIRmerge = await dicom2FHIR(FHIRData);

            await dicom2mongodb(FHIRmerge);
            let baseFileName = path.basename(dicomFile.filename[i]);
            successFHIR.push(baseFileName);
            successFiles.push(baseFileName);
            successFilesStorePath.push(FHIRData.series[0].instance[0].store_path);
        }
        res.header("Content-Type", "application/json");
        let resMessage = {
            result : successFiles ,
            //storePath : successFilesStorePath ,
            successFHIR : successFHIR 
        }
        Object.assign(resMessage , STOWMessage);
        return res.status(retCode).send(resMessage);
    } catch (err) { 
        err = err.message || err;
        console.log('/dicom-web/studies "STOW Api" err, ', err);
        return res.status(500).send(err)
    }
}
