const { logger } = require('../utils/log');
const uuid = require('uuid');
const fs = require('fs');
const _ = require('lodash');
const dicomParser = require('dicom-parser');
const { streamToBuffer } = require('@jorgeferrero/stream-to-buffer');
const { dcm2jpegCustomCmd } = require('../models/dcmtk');
const DICOM_STORE_ROOTPATH = process.env.DICOM_STORE_ROOTPATH;

class MultipartWriter {
    /**
     * 
     * @param {Array<string>} pathsOfImages The path list of the images
     * @param {import('express').Response} res The express response
     * @param {import('express').Request} req
     */
    constructor(pathsOfImages, res, req={}) {
        this.BOUNDARY = `${uuid.v4()}-${uuid.v4()}-raccoon`;
        this.pathsOfImages = pathsOfImages;
        this.res = res;
        this.req = req;
        //this.responseData = "";
    }

    /**
     * Write the boundary
     * @param {boolean} isFirst Do not write \r\n\r\n when start if true
     */
    async writeBoundary(isFirst=false) {
        if (isFirst) {
            this.res.write(`--${this.BOUNDARY}\r\n`);
        } else {
            this.res.write(`\r\n\r\n--${this.BOUNDARY}\r\n`);
        }
    }

    /**
     * Write final boundary
     */
    async writeFinalBoundary() {
        this.res.write(`\r\n--${this.BOUNDARY}--`);
    }
    /**
     * Write the content-type. <br/>
     * If have transferSyntax, write content-type and transfer-syntax.
     * @param {string} type 
     * @param {string} transferSyntax 
     */
    async writeContentType(type, transferSyntax="") {
        if (transferSyntax) {
            this.res.write(`Content-Type: ${type};transfer-syntax=${transferSyntax}\r\n`);
        } else {
            this.res.write(`Content-Type: ${type}\r\n`);
        }
    }

    /**
     * Write the content-length
     * @param {number} length length of content
     */
    async writeContentLength(length) {
        this.res.write('Content-length: ' + length + '\r\n\r\n');
    }

    async writeContentLocation() {
        this.res.write(`Content-Location : ${this.req.protocol}://${this.req.headers.host}${this.req.originalUrl}\r\n`);
    }

    /**
     * Write the buffer in response
     * @param {Buffer} buffer 
     */
    async writeBufferData(buffer) {
        this.res.write(buffer);
    }

    /**
     * Set the content-type to "multipart/related; type=${type}; boundary=${boundary}"
     * @param {string} type the type of the whole content
     */
    async setHeaderMultipartRelatedContentType(type) {
        this.res.set("content-type", `multipart/related; type="${type}"; boundary=${this.BOUNDARY}`);
    }

    async writeDICOMFiles(type) {
        try {
            if (this.pathsOfImages) {
                this.setHeaderMultipartRelatedContentType(type);
                for (let i = 0; i < this.pathsOfImages.length; i++) {
                    console.log(`${DICOM_STORE_ROOTPATH}${this.pathsOfImages[i]}`);
                    let fileBuffer = await streamToBuffer(fs.createReadStream(`${DICOM_STORE_ROOTPATH}${this.pathsOfImages[i]}`));
                    this.writeBoundary(i===0);
                    this.writeContentType(type);
                    this.writeContentLength(fileBuffer.length);
                    this.writeBufferData(fileBuffer);
                }
                this.writeFinalBoundary();
                return true;
            }
            return false;
        } catch(e) {
            logger.error(e);
            return false;
        }
    }

    async writeFrames(type, frameList) {
        this.setHeaderMultipartRelatedContentType();
        let dicomFilename = `${DICOM_STORE_ROOTPATH}${this.pathsOfImages[0]}`;
        let jpegFile = dicomFilename.replace(/\.dcm\b/gi, "");
        let minFrameNumber = _.min(frameList);
        let maxFrameNumber = _.max(frameList);
        let frameNumberCount = maxFrameNumber - minFrameNumber + 1;
        if (minFrameNumber == maxFrameNumber) {
            frameNumberCount = 1;
        }
        let execCmd = "";
        if (process.env.ENV == "windows") {
            execCmd = `models/dcmtk/dcmtk-3.6.5-win64-dynamic/bin/dcmj2pnm.exe --write-jpeg "${dicomFilename}" "${jpegFile}" --frame-range ${minFrameNumber} ${frameNumberCount}`;
        } else if (process.env.ENV == "linux") {
            execCmd = `dcmj2pnm --write-jpeg "${dicomFilename}" "${jpegFile}" --frame-range ${minFrameNumber} ${frameNumberCount}`;
        }
        let dcm2jpegStatus = await dcm2jpegCustomCmd(execCmd);
        if (dcm2jpegStatus) {
            for (let x = 0; x < frameList.length; x++) {
                let frameJpegFile = dicomFilename.replace(/\.dcm\b/gi, `.${frameList[x] - 1}.jpg`);
                let fileBuffer = fs.readFileSync(frameJpegFile);
                let dicomFileBuffer = fs.readFileSync(dicomFilename);
                let dicomDataSet = dicomParser.parseDicom(dicomFileBuffer, {
                    untilTag: "x7fe00010"
                });
                let transferSyntax = dicomDataSet.string('x00020010');
                this.writeBoundary(x==0);
                this.writeContentType(type, transferSyntax);
                this.writeContentLength(fileBuffer.length);
                this.writeContentLocation();
                this.writeBufferData(fileBuffer);
            }
            this.writeFinalBoundary();
            return true;
        }
        return false;
    }
}


module.exports.MultipartWriter = MultipartWriter;