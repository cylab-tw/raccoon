/**
 * 
 * @param {import("mongoose")} mongodb 
 */
module.exports = function (mongodb) {
    
    let recordsSchema =  mongodb.Schema({  }, { strict: false });
    recordsSchema.index(
        {
            "sID" : 1
        }
    );
    recordsSchema.index(
        {
            "pID" : 1
        }
    )
    let Records = mongodb.model('Records_NEW', recordsSchema , 'Records_NEW');
    return Records;
}