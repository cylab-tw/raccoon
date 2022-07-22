const identifierSchema = require('../FHIRmodel/Identifier');
const codingSchema = require('../FHIRmodel/Coding');
const refSchema = require('../FHIRmodel/Reference');
const fs = require('fs');
const _  =require('lodash'); // eslint-disable-line @typescript-eslint/naming-convention
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
            "00200013": {
                vr: {
                    type: String
                },
                Value: {
                    type: [String]
                }
            }
        } ,
        metadata : {
            type : Object , 
            default : void 0
        }
    }, {strict : false});

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
            },
            "00200011": {
                vr: {
                    type: String
                },
                Value: {
                    type: [String]
                }
            }
        }
    }, {strict : false});

    

    const imagingStudySchema = new mongodb.Schema(
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
                type: [codingSchema],
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
                type : [refSchema],
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
    imagingStudySchema.index(
        {
            "id": 1
        },
        {
            unique: true
        }
    );
    imagingStudySchema.index(
        {
            "identifier.value": 1
        }
    );
    imagingStudySchema.index(
        {
            "series.uid": 1
        }
    );
    imagingStudySchema.index(
        {
            "series.instance.uid": 1
        }
    );
    imagingStudySchema.index(
        {
            "subject.identifier.value" : 1
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.0020000D.Value" : 1
        }
    );
    imagingStudySchema.index(
        {
            'series.dicomJson.0020000E.Value' : 1
        }
    );
    imagingStudySchema.index(
        {
            'series.instance.dicomJson.00080018.Value' : 1
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.Alphabetic" : 1 
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.familyName" : 1 
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.givenName" : 1 
            
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.middleName" : 1 
            
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.prefix" : 1 
            
        }
    );
    imagingStudySchema.index(
        {
            "dicomJson.00100010.Value.suffix" : 1 
            
        }
    );

    imagingStudySchema.methods.getFHIRField = function () {
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
    };
    imagingStudySchema.pre('save' , function (next) {
        let dicomStudyDate  = _.get(this , "dicomJson.00080020.Value");
        if (dicomStudyDate) {
            for (let i in dicomStudyDate) {
                dicomStudyDate[i] =  moment(dicomStudyDate[i] , "YYYYMMDD").toDate();
            }
        }
        next();
    });
   // fs.writeFileSync("./data/imagingstudySchema.json" ,JSON.stringify (imagingStudySchema.jsonSchema() , null ,4) , {flag: "w+"});
    const imagingStudy = mongodb.model("ImagingStudy", imagingStudySchema);
    return imagingStudy;
};

