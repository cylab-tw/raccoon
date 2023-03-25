const childProcess = require('child_process');
const path = require("path");
const iconv = require('iconv-lite');
const os = require("os");

const NO_BACK_UP = "-nb";
const MODIFY = "--modify";
const TO_UTF8 = `"0008,0005="`;

class DcmModify {
    constructor() {
        let platform = os.platform();
        /** @private */
        this.executer = {};
        if (platform === "win32") {
            this.handler = new DcmModifyWindowsHandler();
        } else {
            this.handler = new DcmModifyBasicHandler();
        }
    }

    async exec(inputFile, options = []) {
        return this.handler.exec(inputFile, options);
    }
}

class DcmModifyWindowsHandler {
    constructor() { }

    /**
     * Modify file's 0008,0005 to UTF-8 that use 
     * Use for dicom file incorrect (0008,0005)
     * @param {string} inputFile 
     */
    exec(inputFile, options = []) {
        return new Promise((resolve, reject) => {
            let dcmModifyExecBinary = path.resolve(`models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmodify.exe`);
            let execOption = [inputFile, NO_BACK_UP, MODIFY, TO_UTF8, ...options];

            let dcmModifySpawn = childProcess.spawn(dcmModifyExecBinary, execOption, {
                cwd: process.cwd(),
                shell: true
            });

            dcmModifySpawn.stdout.on("data", function (data) {
                if (data) console.log(data);
                resolve(data);
            });

            dcmModifySpawn.on("close", function () {
                resolve(true);
            });

            dcmModifySpawn.stderr.on("data", function (stderr) {
                stderr = iconv.decode(stderr, 'cp950');
                reject(new Error(stderr));
            });

        });
    }
}

class DcmModifyBasicHandler {
    constructor() { }

    /**
     * Convert file to UTF-8 that use dcmModify
     * Use for dicom file missing (0008,0005)
     * @param {string} inputFile 
     */
    exec(inputFile, options = []) {
        return new Promise((resolve, reject) => {
            let dcmModifyExecBinary = `dcmodify`;
            let execOption = [inputFile, NO_BACK_UP, MODIFY, TO_UTF8, ...options];

            let dcmModifySpawn = childProcess.spawn(dcmModifyExecBinary, execOption, {
                cwd: process.cwd(),
                shell: true
            });

            dcmModifySpawn.stdout.on("data", function (data) {
                if (data) console.log(data);
                resolve(data);
            });

            dcmModifySpawn.on("close", function () {
                resolve(true);
            });

            dcmModifySpawn.stderr.on("data", function (stderr) {
                stderr = iconv.decode(stderr, 'cp950');
                reject(new Error(stderr));
            });

        });
    }
}


module.exports.DcmModify = DcmModify;