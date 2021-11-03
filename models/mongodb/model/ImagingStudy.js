const arrayUniquePlugin = require('mongoose-unique-array');

const identifierSchema = require('../FHIRmodel/Identifier');
const codingSchema = require('../FHIRmodel/Coding');
const refSchema = require('../FHIRmodel/Reference');
const fs = require('fs');
const _  =require('lodash');
const moment = require('moment');
module.exports = function (mongodb) {
    require('mongoose-schema-jsonschema')(mongodb);
    const instanceSchema = new mongodb.Schema({
        uid:
        {
            type: String,
            unique: true
        },
        sopClass:
        {
            type : codingSchema , 
            default : void 0
        },
        number:
        {
            type: Number
        },
        title:
        {
            type: String
        },
        store_path:
        {
            type: String
        } , 
        dicomJson : {
            type : Object ,
            default : void 0
        } ,
        metadata : {
            type : Object , 
            default : void 0
        }
    });

    const seriesSchema = new mongodb.Schema({
        uid:
        {
            type: String
        },
        number:
        {
            type: Number
        },
        modality:
        {
            type: codingSchema,
            default: {
                code: "unknown"
            }
        },
        description:
        {
            type: String
        },
        bodySite:
        {
            type: codingSchema,
            default: void 0
        },
        started:
        {
            type: Date
        } , 
        instance : {
            type : [instanceSchema] , 
            default : void 0
        } ,
        dicomJson : {
            "00080020" : {
                vr : {
                    type : String
                } , 
                Value : {
                    type : [Date] 
                }
            } 
        }
    }, {strict : false});

    

    const ImagingStudySchema = new mongodb.Schema(
        {
            resourceType:
            {
                type: String
            },
            id:
            {
                type: String
            },
            identifier: {
                type: [identifierSchema],
                default: void 0
            },
            status: {
                type: String,
                default: "unknown"
            },
            modality: {
                type: codingSchema,
                default: void 0
            },
            subject:
            {
                type: refSchema,
                default: {
                    reference: "Patient/unknown"
                }
            },
            started:
            {
                type: Date
            },
            description:
            {
                type: String
            },
            series: {
                type : [seriesSchema] , 
                default : void 0
            },
            endpoint : {
                type : refSchema , 
                default : void 0
            } ,
            report:
            {
                type: Object
            },
            patient:
            {
                type: Object
            } , 
            dicomJson : {
                "00080020" : {
                    vr : {
                        type : String
                    } , 
                    Value : {
                        type : [Date] 
                    }
                } 
            }
        }, { strict: false });
    ImagingStudySchema.index(
        {
            "id": 1
        },
        {
            unique: true
        }
    );
    ImagingStudySchema.index(
        {
            "identifier.value": 1
        }
    );
    ImagingStudySchema.index(
        {
            "series.uid": 1
        }
    );
    ImagingStudySchema.index(
        {
            "series.instance.uid": 1
        }
    );
    ImagingStudySchema.index(
        {
            "subject.identifier.value" : 1
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.0020000D.Value" : 1
        }
    );
    ImagingStudySchema.index(
        {
            'series.dicomJson.0020000E.Value' : 1
        }
    );
    ImagingStudySchema.index(
        {
            'series.instance.dicomJson.00080018.Value' : 1
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.Alphabetic" : 1 ,
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.familyName" : 1 ,
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.givenName" : 1 ,
            
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.middleName" : 1 ,
            
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.prefix" : 1 ,
            
        }
    );
    ImagingStudySchema.index(
        {
            "dicomJson.00100010.Value.suffix" : 1 ,
            
        }
    );

    ImagingStudySchema.plugin(arrayUniquePlugin);
    ImagingStudySchema.methods.getFHIRField = function () {
        let result =  this.toObject();
        delete result._id;
        delete result.__v;
        delete result["identifier._id"];
        delete result["series._id"];
        delete result["series.instance._id"];
        delete result["series.instance.store_path"];
        delete result["dicomJson"];
        delete result["series.dicomJson"];
        delete result["series.instance.dicomJson"];
        delete result["report"];
        delete result["patient"];
        return result;
    }
    ImagingStudySchema.pre('save' , function (next) {
        let dicomStudyDate  = _.get(this , "dicomJson.00080020.Value");
        if (dicomStudyDate) {
            for (let i in dicomStudyDate) {
                dicomStudyDate[i] =  moment(dicomStudyDate[i] , "YYYYMMDD").toDate()
            }
        }
        next();
    });
   // fs.writeFileSync("./data/imagingstudySchema.json" ,JSON.stringify (ImagingStudySchema.jsonSchema() , null ,4) , {flag: "w+"});
    const ImagingStudy = mongodb.model('ImagingStudy', ImagingStudySchema);
    return ImagingStudy;
}

