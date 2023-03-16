const childProcess = require('child_process');
const path = require("path");
const iconv = require('iconv-lite');
const os = require("os");

const CONVERT_TO_UTF8_OPTION = "--convert-to-utf8";
const DISCARD_ILLEGAL_OPTION = "--discard-illegal";

class DcmConv {
    constructor() {
        let platform = os.platform();
        /** @private */
        this.executer = {};
        if (platform === "win32") {
            this.handler = new DcmConvWindowsHandler();
        } else {
            this.handler = new DcmConvBasicHandler();
        }
    }

    async exec(inputFile, options=[]) {
        return this.handler.exec(inputFile, options);
    }
}

class DcmConvWindowsHandler {
    constructor() {}

    /**
     * Convert file to UTF-8 that use dcmconv
     * Use for dicom file missing (0008,0005)
     * @param {string} inputFile 
     */
    exec(inputFile, options=[]) {
        return new Promise((resolve, reject) => {
            let dcmconvExecBinary = path.resolve(`models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmconv.exe`);
            let execOption = [inputFile, inputFile, CONVERT_TO_UTF8_OPTION, DISCARD_ILLEGAL_OPTION, ...options];

            let dcmcovSpawn = childProcess.spawn(dcmconvExecBinary, execOption, {
                cwd: process.cwd(),
                shell: true
            });

            dcmcovSpawn.stdout.on("data" , function (data) {
                if (data) console.log(data);
                resolve(data);
            });

            dcmcovSpawn.on("close", function() {
                resolve(true);
            });

            dcmcovSpawn.stderr.on("data", function (stderr) {
                stderr = iconv.decode(stderr, 'cp950');
                reject(new Error(stderr));
            });

        });
    }
}

class DcmConvBasicHandler {
    constructor() {}

    /**
     * Convert file to UTF-8 that use dcmconv
     * Use for dicom file missing (0008,0005)
     * @param {string} inputFile 
     */
    exec(inputFile, options=[]) {
        return new Promise((resolve, reject) => {
            let dcmconvExecBinary = `dcmconv`;
            let execOption = [inputFile, inputFile, CONVERT_TO_UTF8_OPTION, DISCARD_ILLEGAL_OPTION, ...options];

            let dcmcovSpawn = childProcess.spawn(dcmconvExecBinary, execOption, {
                cwd: process.cwd(),
                shell: true
            });

            dcmcovSpawn.stdout.on("data" , function (data) {
                if (data) console.log(data);
                resolve(data);
            });

            dcmcovSpawn.on("close", function() {
                resolve(true);
            });

            dcmcovSpawn.stderr.on("data", function (stderr) {
                stderr = iconv.decode(stderr, 'cp950');
                reject(new Error(stderr));
            });

        });
    }
}


module.exports.DcmConv = DcmConv;