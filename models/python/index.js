const fetch = require('node-fetch');
const { exec } = require('child_process');
const condaPath = process.env.CONDA_PATH;
const condaEnvName = process.env.CONDA_GDCM_ENV_NAME;

const getJpeg = {
    'linux': {
        'getJpegByPydicom': async function (storePath, frameNumber=1) {
            return new Promise(async (resolve, reject) => {
                if (process.env.USE_DCM2JPEG_PYTHONAPI) {
                    let fetchRes = await fetch(`http://${process.env.DCM2JPEG_PYTHONAPI_HOST}:${process.env.DCM2JPEG_PYTHONAPI_PORT}/dcm2jpeg?filename=${storePath}&frameNumber=${frameNumber}` , {method : 'POST'});
                    let resBody = await fetchRes.json();
                    console.log(resBody);
                    if (resBody.status) {
                        return resolve(true);
                    }
                } else {
                    exec(`python3 DICOM2JPEG.py ${storePath}`, {
                        cwd: process.cwd()
                    }, function (err, stdout, stderr) {
                        if (err || stderr) {
                            let errObj = err || stderr;
                            console.error(errObj);
                            return resolve(new Error(errObj));
                        }
                        return resolve(true);
                    });
                }
            });
        }
    },
    'windows': {
        'getJpegByPydicom': async function (storePath, frameNumber=1) {
            return new Promise(async (resolve, reject) => {
                if (process.env.USE_DCM2JPEG_PYTHONAPI) {
                    let fetchRes = await fetch(`http://localhost:5000/dcm2jpeg?filename=${storePath}&frameNumber=${frameNumber}` , {method : 'POST'});
                    let resBody = await fetchRes.json();
                    if (resBody.status) {
                        return resolve(true);
                    }
                } else {
                    let cmd = `python DICOM2JPEG.py ${storePath}`;
                    if(process.env.USE_CONDA === "true") cmd = `${condaPath} run -n ${condaEnvName} python DICOM2JPEG.py ${storePath}`;
                    exec(`${cmd}`, {
                        cwd: process.cwd()
                    }, function (err, stdout, stderr) {
                        if (err) {
                            console.log(err);
                            return reject(err);
                        } else if (stderr) {
                            console.log(stderr);
                            return reject(stderr);
                        }
                        return resolve(true);
                    });
                }
            });
        }
    }
};

module.exports = {
    getJpeg : getJpeg
};