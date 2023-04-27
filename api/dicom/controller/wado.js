const apiFunc = require('../../Api_function.js');
const mongodb = require('models/mongodb');
const fs = require('fs');
const path = require('path');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const { getFrameImage, dcmtkSupportTransferSyntax } = require('../../../models/dcmtk/index');
let { getJpeg } = require('../../../models/python/index');
const sharp = require('sharp');
let dicomWebHandleError = require('../../../models/DICOMWeb/httpMessage.js');
const Magick = require('../../../models/magick/index.js'); // eslint-disable-line @typescript-eslint/naming-convention

module.exports = async(req, res) => 
{
    try {
        let param = req.query;
        param = await apiFunc.refreshParam(param);

        res.setHeader('Content-Type' , param.contentType);
        let disk = process.env.DICOM_STORE_ROOTPATH;
        let oriPath = await getInstanceStorePath(param);
        if (!oriPath) {
            res.set('content-type' , 'application/json');
            return dicomWebHandleError.sendNotFoundMessage(req , res);
        }

        let storeAbsPath = path.join(disk, oriPath);
        if (!fs.existsSync(storeAbsPath)) {
            res.set('content-type' , 'application/json');
            return dicomWebHandleError.sendNotFoundMessage(req , res);
        }

        if (param.contentType == 'image/jpeg') {
            if (!param.frameNumber) { //when user get DICOM without frame number, default return first frame image
                param.frameNumber = 1;
            }
            return await handleFrameNumber(param , res , storeAbsPath);
        } else {
            res.writeHead(200 , 
            {
                'Content-Type' : param.contentType ,
                'Content-Disposition' :'attachment; filename=' + path.basename(storeAbsPath)
            });
            return fs.createReadStream(storeAbsPath).pipe(res);
        }
    } catch (e) {
        console.error(e);
        if (e.message) {
            return dicomWebHandleError.sendServerWrongMessage(res , e.message);    
        }
        return dicomWebHandleError.sendServerWrongMessage(res , e);
    }
};
/**
 * 
 * @param {*} param 
 * @param {Magick} magick
 */
function handleImageQuality(param, magick) {
    if (param.imageQuality) {
        magick.quality(param.quality);
    }
}
/**
 * 
 * @param {*} param 
 * @param {sharp.Sharp} imageSharp 
 * @param {Magick} magick
 */
async function handleRegion(param, imageSharp, magick) {
    if (param.region) {
        let [xMin , yMin ,xMax , yMax ] = param.region.split(",").map(v=> parseFloat(v));
        let imageMetadata = await imageSharp.metadata();
        let imageWidth = imageMetadata.width;
        let imageHeight = imageMetadata.height;
        let extractLeft = imageWidth * xMin;
        let extractTop = imageHeight * yMin;
        let extractWidth = imageWidth * xMax - extractLeft;
        let extractHeight = imageHeight * yMax - extractTop;
        magick.crop(extractLeft, extractTop, extractWidth, extractHeight);
    }
}
/**
 * 
 * @param {*} param 
 * @param {sharp.Sharp} imageSharp
 * @param {Magick} magick 
 */
async function handleRowsAndColumns(param, imageSharp, magick) {
    let imageMetadata = await imageSharp.metadata();
    let rows = Number(param.rows);
    let columns = Number(param.columns);
    if (param.rows && param.columns) {
        magick.resize(rows, columns);
    } else if (param.rows) {
        magick.resize(rows, imageMetadata.height);
    } else if (param.columns) {
        magick.resize(imageMetadata.width, columns);
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
        "no": async () => { },
        "yes": async () => {
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
            if (!iccProfileBinaryFile) throw new Error("The Image dose not have icc profile tag");
            let iccProfileSrc = path.join(process.env.DICOM_STORE_ROOTPATH, iccProfileBinaryFile.filename);
            let dest = path.join(process.env.DICOM_STORE_ROOTPATH, iccProfileBinaryFile.filename + `.icc`);
            if (!fs.existsSync(dest)) fs.copyFileSync(iccProfileSrc, dest);
            await magick.iccProfile(dest);
        },
        "srgb": async () => {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/sRGB.icc"));
        },
        "adobergb": async () => {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/adobeRGB.icc"));
        },
        "rommrgb": async () => {
            await magick.iccProfile(path.join(process.cwd(), "models/DICOMWeb/iccprofiles/rommRGB.icc"));
        }
    };
    try {
        if (param.iccprofile) {
            await iccProfileAction[param.iccprofile]();
        }
    } catch (e) {
        console.error("set icc profile error:", e);
        throw e;
    }

}

async function handleFrameNumber (param , res , dicomFile) {
    try {
        if (!_.isNumber(param.frameNumber)) {
            return dicomWebHandleError.sendBadRequestMessage(res, "Parameter error : frameNumber must be Number");
        } 
        if (param.contentType != "image/jpeg") {
            return dicomWebHandleError.sendBadRequestMessage(res, "Parameter error : contentType only support image/jpeg with frameNumber");
        }
        let imageRelativePath = path.relative(process.env.DICOM_STORE_ROOTPATH, dicomFile);
        let images = path.join(process.env.DICOM_STORE_ROOTPATH, imageRelativePath);
        let jpegFile = images.replace(/\.dcm\b/gi , `.${param.frameNumber-1}.jpg`);
        let finalJpegFile = "";

        let dicomJson = await getDICOMJson(param);

        let isValidFrameNumber = checkIsValidFrameNumber(dicomJson, param.frameNumber);
        if (!isValidFrameNumber.status) {
            return dicomWebHandleError.sendBadRequestMessage(res, `invalid frame number: ${param.frameNumber}, but data's frame number is ${isValidFrameNumber.dataFrameNumber}`);
        }

        let transferSyntax = _.get(dicomJson ,"00020010.Value.0");
        if (!dcmtkSupportTransferSyntax.includes(transferSyntax)) {
            let pythonDICOM2JPEGStatus = await getJpeg[process.env.ENV]['getJpegByPydicom'](images);
            if (pythonDICOM2JPEGStatus) {
                return fs.createReadStream(jpegFile).pipe(res);
            }
            res.set('content-type' , 'application/json');
            return dicomWebHandleError.sendServerWrongMessage(res , `can't not convert dicom to jpeg with transfer syntax: ${transferSyntax}`); 
        }

        let windowCenter = _.get(dicomJson, "00281050.Value.0");
        let windowWidth = _.get(dicomJson, "00281051.Value.0");
        let frame;
        if (windowCenter && windowWidth) {
            frame = await getFrameImage(imageRelativePath, param.frameNumber, [
                "+Ww",
                windowCenter,
                windowWidth
            ]);
        } else {
            frame = await getFrameImage(imageRelativePath, param.frameNumber);
        }

        if (frame.status) {
            finalJpegFile = frame.imagePath;
        } else {
            res.set('content-type' , 'application/json');
            return dicomWebHandleError.sendServerWrongMessage(res , `dcmtk Convert frame error ${frame.imageStream}`);
        }
        
        let imageSharp = sharp(finalJpegFile);
        let magick = new Magick(finalJpegFile);
        handleImageQuality(param, magick);
        await handleRegion(param, imageSharp, magick);
        await handleRowsAndColumns(param, imageSharp, magick);
        await handleImageICCProfile(param, magick, param.objectUID);
        //return res.end(await imageSharp.toBuffer(), 'binary');
        await magick.execCommand();
        return res.end(magick.toBuffer(), 'binary');
    } catch(e) {
        console.error(e);
        res.set('content-type' , 'application/json');
        return dicomWebHandleError.sendServerWrongMessage(res , `${e.toString()}`);
    }
}

/**
 * 
 * @param {*} dicomJson 
 * @param {number} frameNumber 
 */
function checkIsValidFrameNumber(dicomJson, frameNumber) {
    let dataFrameNumber = _.get(dicomJson, "00280008.Value.0") | 1;
    dataFrameNumber = parseInt(dataFrameNumber);

    if (dataFrameNumber < frameNumber) {
        return {
            status: false,
            dataFrameNumber
        };
    }

    return {
        status: true,
        dataFrameNumber
    };
}

async function getInstanceStorePath(iParam)
{
    let aggregateQuery = 
    [
        {
            $match : {
                'dicomJson.0020000D.Value' : iParam.studyUID 
            }
        } ,
        {
            $unwind : '$series'
        },
		{
			$match :
			{
                'series.dicomJson.0020000E.Value' :iParam.seriesUID 
			}
        },
        {
            $match :
			{
                'series.instance.dicomJson.00080018.Value' :iParam.objectUID
			}
        } ,
		{
			$project :
			{
				instance : 
				{
					$filter : 
					{
						input : '$series.instance' , 
						as : 'instance' , 
						cond : {$eq:[ '$$instance.uid' , iParam.objectUID]}
					}
				}
			}
		}
	];
    let instance = await findAggregateFunc('ImagingStudy' ,aggregateQuery);
    if (instance.length <=0) return false;
    try {
        return (instance[0].instance[0].store_path);
    } catch (e) {
        console.log("getInstancePath error\r\n"+ JSON.stringify(aggregateQuery , null ,4));
        //console.log(aggregateQuery);
        return false;
    }
    
}

async function getDICOMJson(param) {
    let studyUID = param.studyUID;
    let seriesUID = param.seriesUID;
    let instanceUID = param.objectUID;

    let foundMetadata = await mongodb["dicomMetadata"].findOne({
        $and: [
            {
                studyUID: studyUID
            },
            {
                seriesUID: seriesUID
            },
            {
                instanceUID: instanceUID
            }
        ]
    }).exec();
    if (foundMetadata) return foundMetadata._doc;
    return false;
}

async function findAggregateFunc (collectionName , iQuery)
{
    return new Promise(async (resolve , reject)=>
    {
        let agg =await mongodb[collectionName].aggregate(
            iQuery);
        return resolve(agg);
    });
}