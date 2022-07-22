module.exports = function (mongodb) {
    let dicomMetadataSchema =  mongodb.Schema({  }, { strict: false });
    let dicomMetadata = mongodb.model('dicomMetadata', dicomMetadataSchema , 'dicomMetadata');
    return dicomMetadata;
};
