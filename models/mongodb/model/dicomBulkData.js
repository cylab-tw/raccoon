module.exports = function (mongodb) {
    let dicomBulkDataSchema =  mongodb.Schema({  
        studyUID: {
            type: String,
            default: void 0,
            index: true
        },
        seriesUID: {
            type: String,
            default: void 0,
            index: true
        },
        instanceUID: {
            type: String,
            default: void 0,
            index: true
        },
        filename: {
            type: String,
            default: void 0
        },
        binaryValuePath: {
            type: String,
            default: void 0
        }
    }, { 
        strict: false,
        versionKey: false
    });
    let dicomBulkData = mongodb.model('dicomBulkData', dicomBulkDataSchema, 'dicomBulkData');
    return dicomBulkData;
};
