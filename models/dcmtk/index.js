const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
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


const dcm2jsonV8 = {
    exec : function (dcmfile) {
        return new Promise((resolve) => {
            const dcm2jsonC = require('bindings')('dcm2json');
            try {
                dcm2jsonC(dcmfile , function (data) {
                    let obj = JSON.parse(data);
                    return resolve(obj);
                })
            } catch (e) {
                console.error(e);
                return resolve(false);
            }
        })
    } , 
    dcmString : function (json , tag) {
        let data = _.get(json, tag);
        //console.log("d" , data);
        let value = _.get(data, "Value.0");
        console.log(value);
        return value;
    }
}

async function dcm2jpeg (dicomFile) {
    return new Promise((resolve , reject)=> {
        let execCmd = "";
        let jpegFile = dicomFile.replace('.dcm' ,'.jpg');
        if (process.env.ENV == "windows") {
            execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg ${dicomFile} ${jpegFile}`;
        } else if (process.env.ENV == "linux") {
            execCmd = `dcmj2pnm --write-jpeg ${dicomFile} ${jpegFile}`;
        }
        let [dcmtk , ...cmd] = execCmd.split(" ");
        child_process.execFile(dcmtk , cmd , {
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

async function dcm2jpegCustomCmd (execCmd) {
    return new Promise((resolve , reject)=> {
        let [dcmtk , ...cmd] = execCmd.split(" ");
        child_process.execFile(dcmtk , cmd , {
            cwd : process.cwd() 
        } , function (err , stdout , stderr) {
            if (err) {
                console.error(err);
                return reject(new Error(err));
            } else if (stderr) {
                console.error(stderr);
                return reject(new Error(stderr));
            }
            return resolve(true);
        });
    }) 
}

async function jpeg2dcmFromDataset (filename , dcmFilename , outputFilename) {
    return new Promise((resolve , reject)=> {
        filename = path.normalize(filename);
        outputFilename = path.normalize(outputFilename);
        if (process.env.ENV == "windows") {
            execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/img2dcm.exe ${filename} ${outputFilename} -df ${dcmFilename}`;
        } else if (process.env.ENV == "linux") {
            execCmd = `img2dcm ${filename} ${outputFilename} -df ${dcmFilename}`;
        }
        let [dcmtk , ...cmd] = execCmd.split(" ");
        child_process.execFile(dcmtk , cmd , {
            cwd : process.cwd()
        } , function (error, stdout, stderr) {
            if (stderr) {
                console.error("stderr: " , stderr);
                return reject(new Error(stderr));
            } else if (error) {
                console.error("error:" , error );
                return reject(new Error(error));
            }
            return resolve(true);
        });
    })
}

async function xml2dcm (filename , outputFilename) {
    return new Promise((resolve , reject)=> {
        filename = path.normalize(filename);
        outputFilename = path.normalize(outputFilename);
        if (process.env.ENV == "windows") {
            execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/xml2dcm.exe ${filename} ${outputFilename}`;
        } else if (process.env.ENV == "linux") {
            execCmd = `xml2dcm ${filename} ${outputFilename}`;
        }
        let [dcmtk , ...cmd] = execCmd.split(" ");
        child_process.execFile(dcmtk , cmd ,{encoding : 'buffer'} , function (error, stdout, stderr) {
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


/**
 * 
 * @param {String} imagesPath 
 * @param {int} frameNumber 
 * 
 */

async function getFrameImage (imagesPath , frameNumber) {
    let images = `${process.env.DICOM_STORE_ROOTPATH}${imagesPath}`;
    let jpegFile = images.replace(/\.dcm\b/gi , `.${frameNumber}.jpg`);
    if (fs.existsSync(jpegFile)) {
        let rs = fs.createReadStream(jpegFile);
        return {
            statu : true , 
            imageStream : rs
        };
    }
    if (process.env.ENV == "windows") {
        execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg ${images} ${jpegFile} --frame ${frameNumber}`;
    } else if (process.env.ENV == "linux") {
        execCmd = `dcmj2pnm --write-jpeg ${images} ${jpegFile} --frame ${frameNumber}`;
    }
    let dcm2jpegStatu = await dcm2jpegCustomCmd(execCmd);
    if (dcm2jpegStatu) {
        let rs = fs.createReadStream(jpegFile);
        return {
            statu : true , 
            imageStream : rs
        };
    } else {
        return {
            statu : false
        };
    }
}

module.exports = {
    dcm2json: dcm2json , 
    dcm2jsonV8 : dcm2jsonV8 ,
    dcm2jpeg : dcm2jpeg , 
    dcm2jpegCustomCmd : dcm2jpegCustomCmd ,
    jpeg2dcmFromDataset : jpeg2dcmFromDataset ,
    xml2dcm : xml2dcm , 
    getFrameImage : getFrameImage
}
