const path = require("path");
process.chdir(path.join(__dirname,"../"));
require("rootpath")();
require("dotenv").config();
const fs = require("fs");
const glob = require("glob");
const { stow } = require("./api/dicom-web/stow/service/stow");
const os = require("os");

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes("linux")) {
    process.env.ENV = "linux";
} else if (osPlatform.includes("win")) {
    process.env.ENV = "windows";
}

let filePath = process.argv[2];
function main() {
    console.log(filePath);
    let successFiles = [];
    let errorFiles = [];
    glob("**/*.dcm", { cwd: filePath }, async function (err, matches) {
        for (let file of matches) {
            let fullFilename = path.join(filePath, file);
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

        fs.writeFileSync("local-upload-log.json", JSON.stringify({
            successFiles,
            errorFiles
        }, null, 4));
        
    });
}

main();
