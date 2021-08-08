/**
 * @type {import("mongoose").Model} 
 * @param {import('mongoose')} mongodb 
*/
module.exports = function (mongodb) {
    let dicomToJpegTaskSchema =  mongodb.Schema({  }, { 
        strict: false ,
        versionKey: false
    });
    let dicomToJpegTask = mongodb.model('dicomToJpegTask', dicomToJpegTaskSchema , 'dicomToJpegTask');
    return dicomToJpegTask;
}
