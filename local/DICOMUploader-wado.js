const path = require("path");
process.chdir(path.join(__dirname,"../"));
require("rootpath")();
require("dotenv").config();
const fs = require("fs");
const glob = require("glob");
const os = require("os");
const request = require('request-compose').extend({
    Request: {
        multipart: require('request-multipart')
    }
}).client;

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes("linux")) {
    process.env.ENV = "linux";
} else if (osPlatform.includes("win")) {
    process.env.ENV = "windows";
}

let filePath = process.argv[2];
const STOW_URL = "http://127.0.0.1:8081/dicom-web/studies";

async function storeInstance(filename, stowUrl) {
    let stream = fs.createReadStream(filename);
    
    let response = await request({
        method: "POST",
        url: stowUrl,
        headers: {
            "Content-Type": "multipart/related; type=application/dicom"
        },
        multipart: [
            {
                "Content-Type": "application/dicom",
                "Content-Disposition": `attachment; filename="${filename}"`,
                body: stream
            }
        ],
        timeout: 300000
    });
    return response;
}
async function main() {
    console.log(filePath);
    let successFiles = [];
    glob("**/*.dcm", { cwd: filePath }, async function (err, matches) {
        for (let file of matches) {
            let fullFilename = path.join(filePath, file);
            try {
                let response = await storeInstance(fullFilename, STOW_URL);
                let statusCode = response.res.statusCode;
                if (statusCode === 200) {
                    console.log("success: " + fullFilename);
                } else {
                    console.error("error: " + response.body.result);
                    fs.appendFile("upload-error.txt", `error file: ${fullFilename}\r\n`);
                }
                
            } catch (e) {
                console.error(e);
            }
        }
    });
}
(async () => {
    await main();
})();


