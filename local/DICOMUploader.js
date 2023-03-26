const path = require("path");
process.chdir(path.join(__dirname,"../"));
require("rootpath")();
require("dotenv").config();
const fs = require("fs");
const glob = require("glob");
const { stow } = require("../api/dicom-web/stow/service/stow");
const os = require("os");
const { program } = require("commander");

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes("linux")) {
    process.env.ENV = "linux";
} else if (osPlatform.includes("win")) {
    process.env.ENV = "windows";
}

program.requiredOption("-d, --dir <string>", "The directory path contains DICOM files that need to upload")
       .requiredOption("-u, --url <string>", "STOW-RS URL");
program.parse();

const options = program.opts();

function main() {
    let inputDir = options.dir;
    console.log(`Input Directory: ${inputDir}`);

    let successFiles = [];
    let errorFiles = [];
    glob("**/*.dcm", { cwd: inputDir }, async function (err, matches) {
        for (let file of matches) {
            let fullFilename = path.join(inputDir, file);
            let storeInstanceResult = await stow(
                {
                    headers: {
                        host: "localhost:8081"
                    }
                },
                fullFilename,
                file
            );
            if (!storeInstanceResult.isFailure) {
                successFiles.push(fullFilename);
            } else {
                errorFiles.push(fullFilename);
            }
        }

        fs.writeFileSync(path.join(__dirname, "local-upload-log.json"), JSON.stringify({
            successFiles,
            errorFiles
        }, null, 4));
        
    });
}

main();
