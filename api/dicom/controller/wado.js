const api_func = require('../../Api_function.js');
const mongodb = require('models/mongodb');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const _ = require('lodash');
const dicomParser = require('dicom-parser');
let DICOMWebHandleError = require('../../../models/DICOMWeb/httpMessage.js');
let condaPath = process.env.CONDA_PATH;
let condaEnvName =  process.env.CONDA_GDCM_ENV_NAME;

module.exports = async(req, res) => 
{
    try {
        let param = req.query;
        param = await api_func.Refresh_Param(param);
        if (!param.contentType) {
            param.contentType = 'image/jpeg';
        }
        if (param.requestType != "WADO") {
            return DICOMWebHandleError.sendBadRequestMessage(res , "Parameter error : requestType only allow WADO");
        } else if (param.contentType!= "image/jpeg" && param.contentType != "application/dicom") {
            return DICOMWebHandleError.sendBadRequestMessage(res , "Parameter error : contentType only allow image/jpeg or application/dicom");
        }
        res.setHeader('Content-Type' , param.contentType);
        let disk = process.env.DICOM_STORE_ROOTPATH;
        let ori_Path = await get_Instance_StorePath(param);
        if (!ori_Path) {
            return DICOMWebHandleError.sendNotFoundMessage(req , res);
        }
        let store_Path = `${disk}${ori_Path}`;
        if (!fs.existsSync(store_Path)) {
            return DICOMWebHandleError.sendNotFoundMessage(req , res);
        }
        let dicomFileStream = fs.readFileSync(store_Path);
        let dicomDataSet = dicomParser.parseDicom(dicomFileStream);
        let inputDicomFrameNumber = parseInt(dicomDataSet.intString("x00280008"));
        if (param.contentType == 'image/jpeg') {
            if (param.frameNumber) {
                return handleFrameNumber(param , res , store_Path);
            }
            if (inputDicomFrameNumber > 1) {
                param.frameNumber = 1;
                return handleFrameNumber(param , res , store_Path);
            }
            let jpgFile = store_Path.replace('.dcm' , '.jpg');
            let isExist = fs.existsSync(jpgFile);
            if (isExist) {
                fs.createReadStream(jpgFile).pipe(res);
            } else {
                if (process.env.ENV == "windows") {
                    try {
                        await getJpeg.windows.getJpegByPydicom(store_Path);
                        fs.createReadStream(jpgFile).pipe(res);
                    } catch (e) {
                        console.error(e);
                        try {
                            await getJpegByDCMTK(store_Path);
                            fs.createReadStream(jpgFile).pipe(res);
                        } catch (e) {
                            return res.status(500).json(e);
                        }
                    }
                } else if (process.env.ENV == "linux"){
                    console.log(store_Path);
                    try {
                        await getJpeg.linux.getJpegByPydicom(store_Path);
                        fs.createReadStream(jpgFile).pipe(res);
                    } catch (e) {
                        try {
                            await getJpegByDCMTK(store_Path);
                            fs.createReadStream(jpgFile).pipe(res);
                        } catch (e) {
                            return res.status(500).json(e);
                        }
                    }
                }
            }
        } else {
            res.writeHead(200 , 
            {
                'Content-Type' : param.contentType ,
                'Content-Disposition' :'attachment; filename=' + path.basename(store_Path)
            });
            return fs.createReadStream(store_Path).pipe(res);
        }
    } catch (e) {
        console.error(e);
        if (e.message) {
            return DICOMWebHandleError.sendServerWrongMessage(res , e.message);    
        }
        return DICOMWebHandleError.sendServerWrongMessage(res , e);
    }
}

function handleFrameNumber (param , res , dicomFile) {
    if (!_.isNumber(param.frameNumber)) {
        return DICOMWebHandleError.sendBadRequestMessage(res, "Parameter error : frameNumber must be Number");
    } 
    if (param.contentType != "image/jpeg") {
        return DICOMWebHandleError.sendBadRequestMessage(res, "Parameter error : contentType only support image/jpeg with frameNumber");
    }
    let newFileName = dicomFile.replace(/(\.dcm)/gi , `.${param.frameNumber}.jpg`);
    execFile('models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe', [dicomFile, "--write-jpeg", "--frame" , param.frameNumber , newFileName], function (err, stdout, stderr) {
        if (err) {
            return res.sendServerWrongMessage(res , `dcmtk Convert frame error ${err}`);
        }
        if (stderr) {
            return res.sendServerWrongMessage(res , `dcmtk Convert frame error ${stderr}`);
        }
        return fs.createReadStream(newFileName).pipe(res);
    });
}

async function get_Instance_StorePath(i_Param)
{
    let aggregate_Query = 
    [
        {
            $match : {
                'dicomJson.0020000D.Value' : i_Param.studyUID, 
            }
        } ,
        {
            $unwind : '$series'
        },
		{
			$match :
			{
                'series.dicomJson.0020000E.Value' :i_Param.seriesUID ,
			}
        },
        {
            $match :
			{
                'series.instance.dicomJson.00080018.Value' :i_Param.objectUID
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
						cond : {$eq:[ '$$instance.uid' , i_Param.objectUID]}
					}
				}
			}
		}
	]
    let instance = await find_Aggregate_Func('ImagingStudy' ,aggregate_Query);
    if (instance.length <=0) return false;
    try {
        return (instance[0].instance[0].store_path);
    } catch (e) {
        console.log("getInstancePath error\r\n"+ JSON.stringify(aggregate_Query , null ,4));
        //console.log(aggregate_Query);
        return false;
    }
    
}

const getJpeg = {
    'linux' : {
        'getJpegByPydicom' : async function (store_Path , jpgFile , res) {
            return new Promise((resolve , reject)=> {
                exec(`python3 DICOM2JPEG.py ${store_Path}` , {
                    cwd : process.cwd()
                } , function (err , stdout , stderr) {
                    if (err || stderr) {
                        console.error(err);
                        theError = err;
                        return resolve(new Error(err));
                    } else if (stderr) {
                        console.error(stderr);
                        theError = stderr;
                        return reject(new Error(stderr));
                    }
                    //console.log(stdout);
                    //console.log(stderr);
                    return resolve(true);
                });
            });
        }
    } , 
    'windows' : {
        'getJpegByPydicom' : async function (store_Path) {
            return new Promise ((resolve , reject) => {
                exec(`${condaPath} run -n ${condaEnvName} python DICOM2JPEG.py ${store_Path}` , {
                    cwd : process.cwd()
                } , function (err , stdout , stderr) {
                    if (err) {
                        console.log(err);
                        theError = err;
                        return reject(err);
                    } else if (stderr) {
                        console.log(stderr);
                        theError = stderr;
                        return reject(stderr);
                    }
                    return resolve(true);
                });
            })
        }
    }
}
async function getJpegByDCMTK (store_Path) {
    return new Promise((resolve , reject)=> {
        let execCmd = "";
        if (process.env.ENV == "windows") {
            execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg ${store_Path} ${store_Path.replace('.dcm' ,'.jpg')}`;
        } else if (process.env.ENV == "linux") {
            execCmd = `dcmj2pnm --write-jpeg ${store_Path} ${store_Path.replace('.dcm' ,'.jpg')}`;
        }
        execFile(execCmd , {
            cwd : process.cwd() 
        } , function (err , stdout , stderr) {
            if (err) {
                console.error(err);
                theError = err;
                return reject(new Error(err));
            } else if (stderr) {
                console.error(stderr);
                theError = stderr;
                return reject(new Error(stderr));
            }
            return resolve(true);
        });
    })  
}
async function find_Aggregate_Func (collection_Name , i_Query)
{
    return new Promise(async (resolve , reject)=>
    {
        let agg =await mongodb[collection_Name].aggregate(
            i_Query);
        return resolve(agg);
    });
}