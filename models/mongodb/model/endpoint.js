

const identifierSchema = require('../FHIRmodel/Identifier');
const codingSchema = require('../FHIRmodel/Coding');
const refSchema = require('../FHIRmodel/Reference');
const contactPointSchema = require('../FHIRmodel/ContactPoint');
const periodSchema = require('../FHIRmodel/Period');
const codeableConceptSchema = require('../FHIRmodel/CodeableConcept');
const fs = require('fs');
module.exports = function (mongodb) {
    require('mongoose-schema-jsonschema')(mongodb);
    let endpointSchema =  mongodb.Schema({  
        resourceType : {
            type : String , 
            default : "Endpoint"
        } ,
        id : {
            type : String ,
            unique : true ,
            index : true
        } ,
        identifier : {
            type : [identifierSchema]  ,
            default : void 0 
        } ,
        status : {
            type : String ,
            default : "off"
        } ,
        connectionType : {
            type : codingSchema , 
            default : {
                system : "http://terminology.hl7.org/CodeSystem/endpoint-connection-type" , 
                code : "direct-project"
            }, 
            _id : false
        } , 
        name : {
            type : String ,
            default : void 0
        } ,
        managingOrganization : {
            type : refSchema,
            default : void 0
        } ,
        contact : {
            type : [contactPointSchema] ,
            default : void 0
        } ,
        period : {
            type : periodSchema,
            default : void 0
        } ,
        payloadType : {
            type : [codeableConceptSchema] ,
            default : [
                {
                    text : "DICOM"
                }
            ], 
            _id : false
        } , 
        payloadMimeType : {
            type : [String] ,
            default : void 0
        } ,
        address : {
            type : String , 
            default : "http://localhost"
        }
    });
    endpointSchema.methods.getFHIRField = function () {
        let result =  this.toObject();
        delete result._id;
        delete result.__v;
        return result;
    };
    //fs.writeFileSync("./data/endpoint.json" ,JSON.stringify (endpointSchema.jsonSchema() , null ,4) , {flag: "w+"});
    let endpoint = mongodb.model('endpoint', endpointSchema , 'endpoint');
    return endpoint;
};


