const path = require("path");
process.chdir(path.join(__dirname, "../"));
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
const { program } = require("commander");

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes("linux")) {
    process.env.ENV = "linux";
} else if (osPlatform.includes("win")) {
    process.env.ENV = "windows";
}

program.requiredOption("-d, --dir <string>", "The directory path contains DICOM files that need to upload")
    .requiredOption("-u, --url <string>", "STOW-RS URL", "http://127.0.0.1:8081/dicom-web/studies")
    .option("--resume <string>", "Resume from log file");
program.parse();

const options = program.opts();

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
                "Content-Disposition": `attachment; filename="${path.basename(filename)}"`,
                body: stream
            }
        ],
        timeout: 300000
    });
    return response;
}
async function main() {
    let inputDir = options.dir;
    const STOW_URL = options.url;
    console.log(`Input Directory: ${inputDir}`);

    let resumeFile = options.resume;
    let logUploadedFiles = [];
    let successFiles = [];
    let errorFiles = [];

    if (resumeFile && !fs.existsSync(resumeFile)) {
        console.error("resume file not exist");
        process.exit(1);
    } else if (fs.existsSync(resumeFile)){
        let logInfo = JSON.parse(fs.readFileSync(resumeFile, "utf-8"));
        logUploadedFiles = logInfo.successFiles;
        successFiles = [...logUploadedFiles];
    }

    glob("**/*.dcm", { cwd: inputDir }, async function (err, matches) {
        for (let file of matches) {
            let fullFilename = path.join(inputDir, file);

            if (logUploadedFiles.includes(fullFilename))
                continue;
            
            try {
                let response = await storeInstance(fullFilename, STOW_URL);
                let statusCode = response.res.statusCode;
                if (statusCode === 200) {
                    console.log("success: " + fullFilename);
                    successFiles.push(fullFilename);
                } else {
                    console.error("error: " + response.body.result);
                    errorFiles.push(fullFilename);
                }

            } catch (e) {
                console.error(e);
            }
        }

        fs.writeFileSync(path.join(__dirname, "local-upload-wado-log.json"), JSON.stringify({
            successFiles,
            errorFiles
        }, null, 4));

    });
}
(async () => {
    await main();
})();


