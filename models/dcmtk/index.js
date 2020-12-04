const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const condaPath = process.env.CONDA_PATH
const condaEnvName =  process.env.CONDA_GDCM_ENV_NAME;
function dcm2json(filename) {
    return new Promise((resolve, reject) => {
        let baseName = path.basename(filename);
        let outFile = filename.replace(baseName , `${new Date().getTime()}$&.json`);
        if (process.env.ENV == "windows") {
            child_process.execFile('models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcm2json.exe', [filename, '-ll', 'fatal' , outFile,'--compact-code'], {
                cwd: process.cwd()
            }, function (error, stdout, stderr) {
                if (error) {
                    return reject(new Error(error));
                }
                try {
                    let jsonFile  = fs.readFileSync(outFile , 'utf-8');
                    //清除dcm2json轉出來的json內的NUL (\0)
                    jsonFile = jsonFile.replace(/,\0/g, '');
                    jsonFile = jsonFile.replace(/\0/g, '');
                    let resultJson = JSON.parse(jsonFile);
                    fs.unlinkSync(outFile);
                    //stdout = jsonFile.replace(/[\\\/\0]/g, '\\$&');
                    return resolve(resultJson);
                } catch (e) {
                    return reject(new Error(e));
                }
            });
        } else if (process.env.ENV == "linux") {
            child_process.execFile('dcm2json', [filename, '-ll', 'fatal' , outFile,'--compact-code'], {
                cwd: process.cwd()
            }, function (error, stdout, stderr) {
                if (error) {
                    return reject(new Error(error));
                }
                try {
                    let jsonFile  = fs.readFileSync(outFile , 'utf-8');
                    //清除dcm2json轉出來的json內的NUL (\0)
                    jsonFile = jsonFile.replace(/,\0/g, '');
                    jsonFile = jsonFile.replace(/\0/g, '');
                    let resultJson = JSON.parse(jsonFile);
                    fs.unlinkSync(outFile);
                    //stdout = jsonFile.replace(/[\\\/\0]/g, '\\$&');
                    return resolve(resultJson);
                } catch (e) {
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

module.exports = {
    dcm2json: dcm2json , 
    dcm2jpeg : dcm2jpeg
}
