require("rootpath")();
require("dotenv").config();
const fs = require("fs");
const glob = require("glob");
const path = require("path");
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
            }
        }
        console.log(successFiles);
    });
}

main();
