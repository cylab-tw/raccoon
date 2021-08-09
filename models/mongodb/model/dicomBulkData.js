module.exports = function (mongodb) {
    let dicomBulkDataSchema =  mongodb.Schema({  
        instanceUID: {
            type: String,
            default: void 0,
            index: true
        },
        filename: {
            type: String,
            default: void 0
        }
    }, { 
        strict: false,
        versionKey: false
    });
    let dicomBulkData = mongodb.model('dicomBulkData', dicomBulkDataSchema, 'dicomBulkData');
    return dicomBulkData;
}
