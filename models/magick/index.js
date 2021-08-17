const uuid = require('uuid');
const fs = require('fs');
const _ = require('lodash');
const { execSync, execFileSync } = require('child_process');
const imagemagickCli = require('imagemagick-cli');
class Magick {
    constructor(imageFilename) {
        this.tempFilename = `temp/${uuid.v4()}.jpg`;
        this.magickPrefix = process.env.ENV == 'linux' ? 'convert' : 'magick';
        this.magickCommand = [];
        fs.copyFileSync(imageFilename, this.tempFilename);
    }
    /*async initialize(imageFilename) {
        try {
            fs.copyFileSync(imageFilename,this.tempFilename);
            //await imagemagickCli.exec(`${this.magickPrefix} ${imageFilename} ${this.tempFilename}`);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
    static async create(imageFilename) {
        const myMagick = new Magick();
        await myMagick.initialize(imageFilename);
        return myMagick;
    }*/
    /**
     * @param {number} q
     */
    async quality(q) {
        try {
            this.magickCommand.push("-quality");
            this.magickCommand.push(q);
            /*await imagemagickCli.exec(`${this.magickPrefix} ${this.tempFilename} -quality ${q} ${this.tempFilename}`)*/
            //execSync(`magick ${this.tempFilename} -quality ${q} ${this.tempFilename}`);
            return this;
        } catch(e) {
            console.error(e);
            throw e;
        }
    }

    async iccProfile(profile) {
        try {
            this.magickCommand.push("-profile");
            this.magickCommand.push(profile);
            /*await imagemagickCli.exec(`${this.magickPrefix} ${this.tempFilename} -profile ${profile} ${this.tempFilename}`)*/
            /*execFileSync(exiftool, [`-icc_profile<=${profile}`, this.tempFilename, `-overwrite_original`]);*/
        } catch(e) {
            console.error(e);
            throw e;
        }
    }
    
    async execCommand() {
        try {
            if (this.magickCommand.length > 0) {
                await imagemagickCli.exec(`${this.magickPrefix} ${this.tempFilename} ${this.magickCommand.join(" ")} ${this.tempFilename}`);
            }
        } catch(e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * Finally use to get temp image buffer and remove temp file
     * @return {Buffer}
     */
    toBuffer() {
        try {
            let fileBuffer = fs.readFileSync(this.tempFilename);
            let fileBufferClone = _.cloneDeep(fileBuffer);
            fs.unlink(this.tempFilename, (err)=> {
                if (err)
                console.error(`delete temp image file error : ${err}`);
            });
            return fileBufferClone;
        } catch(e) {
            console.error(e);
            throw e;
        }
    }
}

module.exports = Magick;