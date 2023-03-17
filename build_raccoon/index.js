const OS =require('os');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const glob = require("glob");
const fetch = require('node-fetch');
const AdmZip = require('adm-zip'); //eslint-disable-line @typescript-eslint/naming-convention
const mkdirp = require('mkdirp');
let envText = `
MONGODB_NAME="raccoon"
MONGODB_HOSTS=["mongodb"]
MONGODB_PORTS=[27017]
MONGODB_USER="root"
MONGODB_PASSWORD="Raccoon#Admin2Mongo"
MONGODB_SLAVEMODE=false

SERVER_HOST="0.0.0.0"
SERVER_PORT=8081

DICOM_STORE_ROOTPATH='/dicomFiles'
DICOMWEB_PROTOCOL="http"
DICOMWEB_HOST="localhost"
DICOMWEB_PORT=8081
DICOMWEB_API="dicom-web"

FHIRSERVER_HTTP="http"
FHIRSERVER_APIPATH="api/fhir"
FHIRSERVER_HOST="localhost"
FHIRSERVER_PORT=8081
FHIR_NEED_PARSE_PATIENT=true

USE_CONDA=false
CONDA_PATH="path/conda.exe"
CONDA_GDCM_ENV_NAME="gdcm"

USE_DCM2JPEG_PYTHONAPI=true
DCM2JPEG_PYTHONAPI_HOST="127.0.0.1"
DCM2JPEG_PYTHONAPI_PORT=5000
`;
async function main() {
    if (!fs.existsSync('./temp')) {
        let oldMask = process.umask(0);
        mkdirp.sync('./temp' , "0755");
        process.umask(oldMask);
    }

    let userOS = OS.type().toLowerCase();
    if (userOS.includes("windows")) {
        await genDCMTK("windows");
        osFunc["windows"].checkHaveDCMTK();
    } else if (userOS.includes("linux")) {
        await genDCMTK("linux");
    }

    // Generate .env
    if (!fs.existsSync(".env")) {
        console.log(`create .env in ${path.join(__dirname, "../.env")}`);
        fs.writeFileSync(".env" , envText);
    }

    let frontendConfigPath = path.join(__dirname, "../public/scripts/config.js");
    if (!fs.existsSync(frontendConfigPath)) {
        console.log(`copy config.template.js to ${frontendConfigPath}`);
        fs.copyFileSync(
            path.join(__dirname, "../public/scripts/config.template.js"),
            frontendConfigPath
        );
    }

    let pluginConfigPath = path.join(__dirname, "../plugins/config.js");
    if (!fs.existsSync(pluginConfigPath)) {
        console.log(`copy config.template.js to ${pluginConfigPath}`);
        fs.copyFileSync(
            path.join(__dirname, "../plugins/config.template.js"),
            pluginConfigPath
        );
    }
}
const osFunc = {
    linux : {
        checkHaveDCMTK : () => {
            return new Promise((resolve)=> {
                exec("dcm2json" , function (err , stdout , stderr) {
                    if (err) {
                        if (err.message.includes("not found")) {
                            console.error("Please install DCMTK, more information from: https://dicom.offis.de/en/dcmtk/dcmtk-tools/\r\nif you just need to create config files, please ignore this error");
                            return resolve(true);
                        } else {
                            console.error("checkHaveDCMTK is broken");
                            console.error(err);
                            process.exit(1);
                        }
                    }
                    if (!stdout.includes("not found")) {
                        console.error("Please install DCMTK, more information from: https://dicom.offis.de/en/dcmtk/dcmtk-tools/\r\nif you just need to create config files, please ignore this error");
                        return resolve(true);
                    }
                    return resolve(false);
                });
            });
        } ,
        genDCMTK : () => {}
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
                        return resolve(true);
                    }
                    return resolve(false);
                });
            });
        } ,
        genDCMTK : async ()=> {
            console.log("Doloading DCMTK");
            let fetchRes = await fetch("https://dicom.offis.de/download/dcmtk/dcmtk365/bin/dcmtk-3.6.5-win64-dynamic.zip");
            const dcmtkFileStream = fs.createWriteStream("./build_raccoon/dcmtk.zip");
            fetchRes.body.pipe(dcmtkFileStream);
            fetchRes.body.on("error" , function (err) {
                console.error("download DCMTK failure");
                console.error(err);
                process.exit(1);
            });
            dcmtkFileStream.on("finish" , function () {
                console.log("Finished Donload DCMTK");
                let dcmtkZip = new AdmZip("./build_raccoon/dcmtk.zip");
                dcmtkZip.extractAllToAsync("./models/dcmtk/" , true);
                console.log("Finished Extract DCMTK");
                fs.unlinkSync("./build_raccoon/dcmtk.zip");
            });
        }
    }
};

async function genDCMTK (osType) {
    let haveDCMTK = await osFunc[osType].checkHaveDCMTK();
    if (!haveDCMTK) {
        console.log("Don't have DCMTK. Will download DCMTK.");
        await osFunc[osType].genDCMTK();
    }
}

main();