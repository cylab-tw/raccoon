
module.exports = function (mongodb) {
    let recordsSchema =  mongodb.Schema({  }, { strict: false });
    let Records = mongodb.model('Records', recordsSchema , 'Records');
    return Records;
};


