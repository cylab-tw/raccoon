/**
 * 
 * @param {import("mongoose")} mongodb 
 * 
 */

module.exports = function (mongodb) {
    let FHIRStoredIDSchema = mongodb.Schema({
        id: {
            type: String ,
            default : void 0
        },
        resourceType: {
            type: String ,
            default : void 0
        }
    } , {
        versionKey : false
    });
    FHIRStoredIDSchema.index({
        "id": 1
    }, {
        unique: true
    });
    FHIRStoredIDSchema.index({
        "resourceType" : 1
    });
    let FHIRStoredID = mongodb.model('FHIRStoredID', FHIRStoredIDSchema, 'FHIRStoredID');
    return FHIRStoredID;
};