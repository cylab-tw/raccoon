const api_func = require('../../Api_function.js');
const mongodb = require('models/mongodb');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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
        res.setHeader('Content-Type' , param.contentType);
        let disk = process.env.DICOM_STORE_ROOTPATH;
        let ori_Path = await get_Instance_StorePath(param);
        if (!ori_Path) {
            res.setHeader('Content-Type' , 'text/*');
            sendNotFoundMessage(req , res);
            return;
        }
        let store_Path = `${disk}${ori_Path}`;
        if (!fs.existsSync(store_Path)) {
            res.setHeader('Content-Type' , 'text/*');
            sendNotFoundMessage(req , res);
            return;
        }
        if (param.contentType == 'image/jpeg') {
            let jpgFile = store_Path.replace('.dcm' , '.jpg');
            //let isExist =await fileFunc.checkExist(jpgFile);
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
            fs.createReadStream(store_Path).pipe(res);
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({message:"server wrong"});
    }
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
        console.log("error\r\n"+ JSON.stringify(aggregate_Query , null ,4));
        //console.log(aggregate_Query);
        return false;
    }
    
}
function sendNotFoundMessage (req , res){
    let message = {
        "Details" : "Accessing an inexistent", 
        "HttpStatus" : 404,
        "Message" : "Bad request",
        "Method" : "GET",
    }
    let notFoundStr = []
    for (let i in req.query) {
        notFoundStr.push(`${i}:${req.query[i]}`);
    }
    message.Details += notFoundStr.join(',');
    res.status(404).send(JSON.stringify(message , null , 4));
    res.end();  
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
        exec(`dcmj2pnm --write-jpeg ${store_Path} ${store_Path.replace('.dcm' ,'.jpg')}` , {
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