
module.exports = function (mongodb) {
    let recordsSchema =  mongodb.Schema({  }, { strict: false });
    let records = mongodb.model('Records', recordsSchema , 'Records');
    return records;
};


