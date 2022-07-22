const mongodb = require('models/mongodb');
const mongoFunc = require('models/mongodb/func');
const fs = require('fs');

var errorMessage = "";
module.exports = async function (req , res) {
    let params = Object.assign({} , req.params);
    let keysLen = Object.keys(params).length;
    let deleteImageFileFunc = [deleteStudyImage , deleteSeriesImage , deleteInstanceImage];
    
    let deleteFileStatu = await deleteImageFileFunc[keysLen-1](params);
    let deleteFunc = [deleteStudy , deleteSeries , deleteInstance];
    let deleteDataStatu = await deleteFunc[keysLen-1](params);
    //檢查刪除mognodb資料
    if (deleteDataStatu) {
        let success = {deleteDataStatu : "Delete data successfully"};
        //檢查刪除檔案
        if (deleteFileStatu) {
            success["deleteFileStatu"] = "delete file success";
            return res.status(204).json(success);
        }
        success["deleteFileStatu"] = "delete file failure , maybe have data but not have file";
        return res.status(204).json(success);
    } else {
        return res.status(500).end();
    }
};

async function deleteStudyImage (iParams) {
    return new Promise(async (resolve)=> {
        let imagesPath = await mongoFunc.getStudyImagesPath(iParams);
        if (imagesPath) {
            for (let i = 0 ; i < imagesPath.length ; i++) {
                try {
                    fs.unlinkSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                } catch (err) {
                    console.log(err);
                    return resolve(false);
                }
            }
            return resolve(true);
        }
        return resolve(false);
    });
}
async function deleteSeriesImage (iParams) {
    return new Promise(async (resolve)=> {
        let imagesPath = await mongoFunc.getStudyImagesPath(iParams);
        if (imagesPath) {
            for (let i = 0 ; i < imagesPath.length ; i++) {
                try {
                    fs.unlinkSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                } catch (err) {
                    console.log(err);
                    return resolve(false);
                }
            }
            return resolve(true);
        }
        return resolve(false);
    });
}
async function deleteInstanceImage (iParams) {
    return new Promise(async (resolve)=> {
        let imagesPath = await mongoFunc.getStudyImagesPath(iParams);
        if (imagesPath) {
            for (let i = 0 ; i < imagesPath.length ; i++) {
                try {
                    fs.unlinkSync(`${process.env.DICOM_STORE_ROOTPATH}${imagesPath[i]}`);
                } catch (err) {
                    console.log(err);
                    return resolve(false);
                }
            }
            return resolve(true);
        }
        return resolve(false);
    });
}


async function deleteStudy (iParams) {
    try {
        await mongodb.ImagingStudy.deleteOne({"identifier.value" : `urn:oid:${iParams.studyID}`});
        return true;
    } catch(e) {
        console.error(e);
        errorMessage = e;
        return false;
    }
}

async function deleteSeries (iParams) {
    return new Promise (async (resolve)=>{
        let query = {
            "identifier.value": `urn:oid:${iParams.studyID}`
        };
        let deleteSeriesCmd = {
            "$pull": {
                "series": {
                    "uid": `${iParams.seriesID}`
                }
            }
        };
        mongodb.ImagingStudy.updateOne(query , deleteSeriesCmd , function (err ,res){
            if (err) {
                errorMessage = err;
                return resolve(false);
            }
            return resolve(true);
        });
    });
}

async function deleteInstance (iParams) {
    return new Promise ((resolve)=> {
        let query = {
            "identifier.value": `urn:oid:${iParams.studyID}` , 
            "series.uid":  `${iParams.seriesID}`
        };
        let deleteInstanceCmd = {
            "$pull": {
                "series.$.instance": {
                    "uid": `${iParams.instanceID}`
                }
            }
        };
        mongodb.ImagingStudy.updateOne(query , deleteInstanceCmd  , function (err ,res){
            if (err) {
                errorMessage = err;
                return resolve(false);
            }
            return resolve(true);
        });
    });
}