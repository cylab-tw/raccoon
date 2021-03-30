const { exec } = require('child_process');
const condaPath = process.env.CONDA_PATH;
const condaEnvName = process.env.CONDA_GDCM_ENV_NAME;

const getJpeg = {
    'linux': {
        'getJpegByPydicom': async function (store_Path) {
            return new Promise((resolve, reject) => {
                exec(`python3 DICOM2JPEG.py ${store_Path}`, {
                    cwd: process.cwd()
                }, function (err, stdout, stderr) {
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
    },
    'windows': {
        'getJpegByPydicom': async function (store_Path) {
            return new Promise((resolve, reject) => {
                exec(`${condaPath} run -n ${condaEnvName} python DICOM2JPEG.py ${store_Path}`, {
                    cwd: process.cwd()
                }, function (err, stdout, stderr) {
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

module.exports = {
    getJpeg : getJpeg
}