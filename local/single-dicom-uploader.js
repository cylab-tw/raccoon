const path = require("path");
process.chdir(path.join(__dirname,"../"));
require("rootpath")();
require("dotenv").config();
const { stow } = require("../api/dicom-web/stow/service/stow");
const os = require("os");
const { program } = require("commander");

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes("linux")) {
    process.env.ENV = "linux";
} else if (osPlatform.includes("win")) {
    process.env.ENV = "windows";
}

program.requiredOption("-f, --file <string>", "The DICOM file that need to upload");
program.parse();

const options = program.opts();

let filePath = options.file;
async function main() {
    console.log(`input file: ${filePath}`);

    let storeInstanceResult = await stow(
        {
            headers: {
                host: "localhost:8081"
            }
        },
        path.basename(filePath)
    );

    if (storeInstanceResult.isFailure) {
        console.error(storeInstanceResult.message);
        process.exit(1);
    }
    
    console.log(storeInstanceResult.message);
    process.exit(0);
}

( async () => {
    await main();
})();
