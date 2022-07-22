/** 
 * This schema is log status of generate all JPEG in DICOM file
 * @type {import("mongoose").Model} 
 * @param {import('mongoose')} mongodb 
*/

module.exports = function (mongodb) {
    
    let dicomToJpegTaskSchema =  mongodb.Schema({  
        studyUID: {
            type: String,
            default: void 0   
        },
        seriesUID: {
            type: String,
            default: void 0
        },
        instanceUID: {
            type: String,
            default: void 0
        },
        message: { //processing | generated | error message
            type: String,
            default: void 0
        },
        status: {
            type: Boolean,
            default: false
        }
        
    }, { 
        strict: false ,
        versionKey: false
    });
    let dicomToJpegTask = mongodb.model('dicomToJpegTask', dicomToJpegTaskSchema , 'dicomToJpegTask');
    return dicomToJpegTask;
};
