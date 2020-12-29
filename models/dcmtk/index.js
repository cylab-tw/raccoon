const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const condaPath = process.env.CONDA_PATH
const condaEnvName =  process.env.CONDA_GDCM_ENV_NAME;
const iconv = require('iconv-lite')
function dcm2json(filename) {
    function readGenJson (outFilename) {
        try {
            let jsonFile  = fs.readFileSync(outFilename , 'utf-8');
            //清除dcm2json轉出來的json內的NUL (\0)
            jsonFile = jsonFile.replace(/,\0/g, '');
            jsonFile = jsonFile.replace(/\0/g, '');
            let resultJson = JSON.parse(jsonFile);
            delete resultJson["7fe00010"];
            fs.unlinkSync(outFilename);
            //stdout = jsonFile.replace(/[\\\/\0]/g, '\\$&');
            return resultJson;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
    return new Promise((resolve, reject) => {
        let baseName = path.basename(filename);
        let outFile = filename.replace(baseName , `${new Date().getTime()}$&.json`);
        if (process.env.ENV == "windows") {
            child_process.execFile('models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcm2json.exe', [filename, '-ll', 'fatal' , outFile,'--compact-code'], {
                cwd: process.cwd()
            }, function (error, stdout, stderr) {
                if (error) {
                    console.error(error);
                    return reject(new Error(error));
                }
                try {
                    let resultJson = readGenJson(outFile);
                    if (!resultJson) {
                        return reject(new Error("dcm2json fail"));
                    }
                    return resolve(resultJson);
                } catch (e) {
                    console.error(e);
                    return reject(new Error(e));
                }
            });
        } else if (process.env.ENV == "linux") {
            child_process.execFile('dcm2json', [filename, '-ll', 'fatal' , outFile,'--compact-code'], {
                cwd: process.cwd()
            }, function (error, stdout, stderr) {
                if (error) {
                    console.error(error);
                    return reject(new Error(error));
                }
                try {
                    let resultJson = readGenJson(outFile);
                    if (!resultJson) {
                        return reject(new Error("dcm2json fail"));
                    }
                    //stdout = jsonFile.replace(/[\\\/\0]/g, '\\$&');
                    return resolve(resultJson);
                } catch (e) {
                    console.error(e);
                    return reject(new Error(e));
                }
            });
        }
    });
}

async function dcm2jpeg (imageFile) {
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

async function xml2dcm (filename , outputFilename) {
    return new Promise((resolve , reject)=> {
        filename = path.normalize(filename);
        outputFilename = path.normalize(outputFilename);
        console.log(`models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/xml2dcm.exe ${filename} ${outputFilename}`);
        child_process.execFile(`models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/xml2dcm.exe` , [filename , outputFilename] ,{encoding : 'buffer'} , function (error, stdout, stderr) {
            stderr = iconv.decode(stderr , 'cp950');
            if (stderr) {
                console.error("stderr: " , );
                return reject(new Error(stderr));
            } else if (error) {
                console.error("error:" , error );
                return reject(new Error(error));
            }
            return resolve(true);
        });
    })

}

module.exports = {
    dcm2json: dcm2json , 
    dcm2jpeg : dcm2jpeg , 
    xml2dcm : xml2dcm
}
