const OS =require('os');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const glob = require("glob");
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
const mkdirp = require('mkdirp')
let envText = `
MONGODB_NAME="dbName"
MONGODB_HOSTS=["localhost"]
MONGODB_PORTS=[27017]
MONGODB_USER="user"
MONGODB_PASSWORD="password"
MONGODB_SLAVEMODE=false

SERVER_HOST="localhost"
SERVER_PORT=80

DICOM_STORE_ROOTPATH='C:/'
DICOMWEB_HOST="localhost"
DICOMWEB_PORT=80
DICOMWEB_API="dicom-web"

FHIRSERVER_HTTP="http"
FHIRSERVER_APIPATH="api/fhir"
FHIRSERVER_HOST="localhost"
FHIRSERVER_PORT=80
FHIR_NEED_PARSE_PATIENT=true

CONDA_PATH="path/conda.exe"
CONDA_GDCM_ENV_NAME ="gdcm"

USE_DCM2JPEG_PYTHONAPI=true
DCM2JPEG_PYTHONAPI_HOST=localhost
DCM2JPEG_PYTHONAPI_PORT=5000

ENABLE_LOGIN_ACCESS=false
`
async function main() {
    if (!fs.existsSync('./temp')) {
        mkdirp.sync('./temp' , 0775);
    }
    let userOS = OS.type().toLowerCase();
    if (userOS.includes("windows")) {
        await genDCMTK("windows");
        osFunc["windows"].checkHaveDCMTK();
    } else if (userOS.includes("linux")) {
        await genDCMTK("linux");
    }
    if (!fs.existsSync(".env")) {
        fs.writeFileSync(".env" , envText);
    }
}
const osFunc = {
    linux : {
        checkHaveDCMTK : () => {
            return new Promise((resolve)=> {
                exec("dcm2json" , function (err , stdout , stderr) {
                    if (err) {
                        console.error("checkHaveDCMTK is broken");
                        console.error(err);
                        process.exit(1);
                    }
                    if (!stdout.includes("not found")) {
                        return resolve(true);
                    }
                    return resolve(false);
                });
            });
        } ,
        genDCMTK : () => {
            console.log("Doloading DCMTK");
            exec("sudo apt-get install dcmtk" , function (err , stdout , stderr) {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
            });
        }
    } , 
    windows : {
        checkHaveDCMTK : () => {
            return new Promise((resolve)=> {
                glob("./models/dcmtk/**/dcm2json.exe" , function (err , files) {
                    if (err)  {
                        console.error("checkHaveDCMTK is broken");
                        console.error(err);
                        process.exit(1);
                    }
                    if (files.length > 0 ) {
                        envText = `
MONGODB_NAME="dbName"
MONGODB_HOSTS=["mongodb"]
MONGODB_PORTS=[27017]
MONGODB_USER="user"
MONGODB_PASSWORD="password"
MONGODB_SLAVEMODE=false

SERVER_HOST="localhost"
SERVER_PORT=80

DICOM_STORE_ROOTPATH='/dicomFiles'
DICOMWEB_HOST="localhost"
DICOMWEB_PORT=80
DICOMWEB_API="dicom-web"
DCMTK_ROOT_PATH="${(path.resolve(path.dirname(files[0]))).replace(/\\/g , '/')}"

FHIRSERVER_APIPATH="api/fhir"
FHIRSERVER_HOST="localhost"
FHIRSERVER_PORT=80
FHIR_NEED_PARSE_PATIENT = true

CONDA_PATH="path/conda.exe"
CONDA_GDCM_ENV_NAME="gdcm"


USE_DCM2JPEG_PYTHONAPI=true
DCM2JPEG_PYTHONAPI_HOST=localhost
DCM2JPEG_PYTHONAPI_PORT=5000

ENABLE_LOGIN_ACCESS=true
`
                        return resolve(true);
                    }
                    return resolve(false);
                });
            });
        } ,
        genDCMTK : async ()=> {
            console.log("Doloading DCMTK");
            let fetchRes = await fetch("https://dicom.offis.de/download/dcmtk/dcmtk365/bin/dcmtk-3.6.5-win64-dynamic.zip");
            const DCMTKFilestream = fs.createWriteStream("./build_raccoon/dcmtk.zip");
            fetchRes.body.pipe(DCMTKFilestream);
            fetchRes.body.on("error" , function (err) {
                console.error("download DCMTK failure");
                console.error(err);
                process.exit(1);
            });
            DCMTKFilestream.on("finish" , function () {
                console.log("Finished Donload DCMTK");
                let dcmtkZip = new AdmZip("./build_raccoon/dcmtk.zip");
                dcmtkZip.extractAllToAsync("./models/dcmtk/" , true);
                console.log("Finished Extract DCMTK");
                fs.unlinkSync("./build_raccoon/dcmtk.zip");
            });
        }
    }
}

async function genDCMTK (osType) {
    let haveDCMTK = await osFunc[osType].checkHaveDCMTK();
    if (!haveDCMTK) {
        console.log("Don't have DCMTK. Will download DCMTK.");
        await osFunc[osType].genDCMTK();
    }
}

main();