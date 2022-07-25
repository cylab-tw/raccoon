/**
 * 
 * @param {import("mongoose")} mongodb 
 * 
 */

module.exports = function (mongodb) {
    let fhirStoredIDSchema = mongodb.Schema({
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
    fhirStoredIDSchema.index({
        "id": 1
    }, {
        unique: true
    });
    fhirStoredIDSchema.index({
        "resourceType" : 1
    });
    let fhirStoredID = mongodb.model('FHIRStoredID', fhirStoredIDSchema, 'FHIRStoredID');
    return fhirStoredID;
};