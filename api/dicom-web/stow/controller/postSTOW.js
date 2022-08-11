const path = require("path");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const { performance } = require("perf_hooks");
const formidable = require("formidable");
const {
    sendServerWrongMessage
} = require("../../../../models/DICOMWeb/httpMessage");
const uuid = require("uuid");
const { logger } = require("../../../../utils/log");
const { stow } = require("../service/stow");

//browserify
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/Formidable.js#L496
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/src/plugins/multipart.js#L47
//https://github.com/node-formidable/formidable/blob/6baefeec3df6f38e34c018c9e978329ae68b4c78/examples/multipart-parser.js#L13



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

/**
 * 500 > 409 > 400 > 200
 * @param {number} statusCode 
 * @param {object} iStoreInstanceResult
 */
function setResStatusCode(statusCode, iStoreInstanceResult) {
    if ( statusCode === 500 ) return 500;
    
    if ( iStoreInstanceResult.httpStatusCode === 500 && statusCode !== 500) return 500;

    if ( iStoreInstanceResult.httpStatusCode === 409 && statusCode !== 409 ) return 409;

    if ( iStoreInstanceResult.httpStatusCode === 400 && statusCode !== 400) return 400;

    return statusCode;
}

function updateFailureMessage(stowMessage, sopSeq, iStoreInstanceResult) {
    let failureMessage = {
        "00081197": {
            vr: "US",
            Value: [iStoreInstanceResult.statusCode]
        }
    }
    Object.assign(sopSeq, failureMessage);
    stowMessage["00081198"].Value.push(sopSeq);
}

module.exports = async (req, res) => {
    //store the successFiles;
    let successFiles = [];
    let successFHIR = [];
    let stowMessage = {
        "00081190": {
            //Study retrieve URL
            vr: "UR",
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
            try {
                for (let i = 0; i < uploadedFiles.length; i++) {
                    // If upload file doesn't has filename, give it uuid filename
                    if (!uploadedFiles[i].name) {
                        uploadedFiles[i].name = `${uuid.v4()}.dcm`;
                        logger.info(
                            `[STOW-RS] [Cannot find filename from request, name the file to ${uploadedFiles[i].name}]`
                        );
                    }

                    let storeInstanceResult = await stow(req, uploadedFiles[i].path, uploadedFiles[i].name);

                    // The file can not convert to DICOM JSON module
                    // Stop process and send error message
                    if (storeInstanceResult.isFailure && storeInstanceResult.statusCode === 273) {
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

                    let sopSeq = getSOPSeq(storeInstanceResult.uidObj.sopClass, 
                        storeInstanceResult.uidObj.instanceUID);
                    let retrieveInstanceUrlJson = {
                        "00081190": {
                            vr: "UR",
                            Value: [
                                storeInstanceResult.retrieveUrlObj.instanceRetrieveUrl
                            ]
                        }
                    };

                    if (storeInstanceResult.isFailure) {
                        
                        retCode = setResStatusCode(retCode, storeInstanceResult);
                        updateFailureMessage(stowMessage, sopSeq, storeInstanceResult);

                    } else {

                        stowMessage["00081190"].Value.push(
                            storeInstanceResult.retrieveUrlObj.studyRetrieveUrl
                        );
                        stowMessage["00081190"].Value = _.uniq(
                            stowMessage["00081190"].Value
                        );

                        
                        Object.assign(sopSeq, retrieveInstanceUrlJson);
                        stowMessage["00081199"].Value.push(sopSeq);

                        let baseFileName = path.basename(uploadedFiles[i].name);
                        successFHIR.push(baseFileName);
                        successFiles.push(baseFileName);
                        
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