
require('rootpath')();
require("dotenv").config();
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const { STOWWithoutRoute } = require('./api/dicom-web/stow/controller/postSTOW');
const os = require('os');

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes('linux')) {
  process.env.ENV = "linux";
} else if (osPlatform.includes('win')) {
  process.env.ENV = "windows";
}


let filePath = process.argv[2];
function main () {
    //let filePath = path.join(process.cwd() , "files");
    console.log(filePath);
    let successFiles = [];
    glob("**/*.dcm" , {cwd : filePath} , async function (err,  matches) {
        for(file of matches) {
            let status = await STOWWithoutRoute(path.join(filePath ,file));
            if (status) {
              successFiles.push(filePath);
            }
        }
        console.log(successFiles);
    });
}

main();