const Busboy = require('busboy'); // eslint-disable-line @typescript-eslint/naming-convention
const path = require('path');
const fs = require('fs');
const { xml2dcm } = require('../../../models/dcmtk');
const ReadableStreamClone = require("readable-stream-clone"); // eslint-disable-line @typescript-eslint/naming-convention


const uploadFile = (req) => {
    console.log('====================');
    return new Promise(async (resolve, reject) => {
        try {
            const busboy = new Busboy({
                headers: req.headers
            });
            let files = {};
            files.filename =  [];
            files.files = [];
            let filelength = 0;
            busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
                console.log('Field [' + fieldname + ']: value: ' + val);
            });
    
            busboy.on('file', async function (fieldname, file, filename, encoding, mimetype) {
                filelength++;
                files.files.push(new ReadableStreamClone(file));
                files.filename.push(filename);
                files.encoding = encoding;
                files.mimeType = mimetype;
                file.resume();
                file.on('end', async function() {
                    --filelength;
                    if(filelength == 0) {
                        console.log('Upload complete');
                        resolve(files);
                    }
                });
            });
            busboy.on('finish', function () {
                console.log('Upload complete finish');
                resolve(files);
            });
            busboy.on('error', function (err) {
                reject(err);
            });
            return req.pipe(busboy);
        } catch (e) {
            return reject(new Error(e));
        }
    });
};

async function storeFile (filestream , writestream , storeFileName) {
    return new Promise((resolve) => {
        filestream.pipe(writestream);
        writestream.on("finish" , async function () {
            let outputFileName = storeFileName.replace(".xml" , ".dcm");
            let isStoreXml = await xml2dcm(storeFileName , outputFileName);
            if (isStoreXml) {
                fs.unlinkSync(storeFileName);
                let outputBasename = path.basename(outputFileName);
                return resolve(outputBasename);
            }
        });
        writestream.on("error" , function (err) {
            console.error(err);
            return resolve(false);
        });
    });
}
module.exports = async function (req , res) {
    let files = await uploadFile(req);
    try {
        let result = [];
        for (let key in files.filename) {
            let filename = files.filename[key];
            let storeFileName = `${__dirname}/../upload_xml/${filename}`;
            let xmlWS  = fs.createWriteStream(storeFileName);
            let storeFileStatu = await storeFile(files.files[key] , xmlWS , storeFileName);
            if (storeFileStatu) {
                result.push(`http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/xml2dcm/${storeFileStatu}`);
            }
        }
        res.send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send("server error");
    }
};


