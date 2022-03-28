const { logger } = require('../utils/log');
const uuid = require('uuid');
const fs = require('fs');
const { streamToBuffer } = require('@jorgeferrero/stream-to-buffer');
const DICOM_STORE_ROOTPATH = process.env.DICOM_STORE_ROOTPATH;

class MultipartWriter {
    /**
     * 
     * @param {Array<string>} pathsOfImages The path list of the images
     */
    constructor(pathsOfImages) {
        this.BOUNDARY = `${uuid.v4()}-${uuid.v4()}-raccoon`;
        this.pathsOfImages = pathsOfImages;
        //this.responseData = "";
    }

    async writeDICOMFiles(res, type) {
        try {
            if (this.pathsOfImages) {
                res.set("content-type", `multipart/related; type="${type}"; boundary=${this.BOUNDARY}`);
                for (let i = 0; i < this.pathsOfImages.length; i++) {
                    console.log(`${DICOM_STORE_ROOTPATH}${this.pathsOfImages[i]}`);
                    let fileBuffer = await streamToBuffer(fs.createReadStream(`${DICOM_STORE_ROOTPATH}${this.pathsOfImages[i]}`));
                    res.write(`${i == 0 ? "" : "\r\n\r\n"}--${this.BOUNDARY}\r\n`);
                    res.write(`Content-Type: ${type}\r\n`);
                    res.write('Content-length: ' + fileBuffer.length + '\r\n\r\n');
                    res.write(fileBuffer);
                }
                res.write(`\r\n--${this.BOUNDARY}--`);
                return true;
            }
            return false;
        } catch(e) {
            logger.error(e);
            return false;
        }
    }
}


module.exports.MultipartWriter = MultipartWriter;