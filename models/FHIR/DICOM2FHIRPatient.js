const dicomParser= require("dicom-parser");
const fs = require('fs');
const path = require('path');
const _ =require("lodash"); //eslint-disable-line @typescript-eslint/naming-convention
const moment = require("moment");

class HumanName {
    constructor() {
        this.use = "anonymous";
        this.text = undefined;
        this.family = undefined; //姓氏
        this.given = undefined; //名字或中間名
        this.prefix = undefined;
        this.suffix = undefined;
    }
    toJson()
    {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {}); 
    }
}

async function dcm2Patient(filename)
{
    let dicomfile = await getFile(filename);
    let dataset = dicomParser.parseDicom(dicomfile);
    let pName = dataset.string('x00100010');
    let pGender = dataset.string('x00100040') || "unknown";
    const FHIR_GENDER = {
        "M": "male",
        "F": "female",
        "O": "other",
        "UNKNOWN": "unknown"
    };
    pGender = FHIR_GENDER[pGender.toUpperCase()];
    let pBD = dataset.string('x00100030');
    let patientName = new HumanName();
    if (pName == undefined) {
        pName = "UNKNOWN";
    } else {
        patientName.use = "usual";
    }
    patientName.text = pName;
    let dicomPatientName = _.pickBy(dicomParser.parsePN(pName) ,  _.identity); //remove undefined or null key
    
    patientName = patientName.toJson();
    let pJson = JSON.stringify(patientName);
    pJson = JSON.parse(pJson);
    let fhirPatientName = {
        familyName: (pJson) => {
            pJson.family = dicomPatientName.familyName;
        },
        givenName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(dicomPatientName.givenName);
            } else {
                pJson.given = [];
                pJson.given.push(dicomPatientName.givenName);
            }
        },
        middleName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(dicomPatientName.middleName);
            } else {
                pJson.given = [];
                pJson.given.push(dicomPatientName.middleName);
            }
        },
        prefix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(dicomPatientName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(dicomPatientName.middleName);
            }
        },
        suffix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(dicomPatientName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(dicomPatientName.middleName);
            }
        }
    };
    for (let key in dicomPatientName) {
        fhirPatientName[key](pJson);
    }
    let patient = 
    {
        resourceType: "Patient",
        id: dataset.string('x00100020') || "unknown",
        gender: pGender,
        active: true,
        name: [
            pJson
        ]
    };
    if (pBD) {
        patient.birthDate = moment.utc(pBD).format("YYYY-MM-DD");
    }
    return patient;
}
function dcmJson2Patient(dcmJson)
{
    let pName = dcmString(dcmJson , '00100010');
    let pGender = dcmString(dcmJson , '00100040') || "unknown";
    const FHIR_GENDER = {
        M: "male",
        F: "female",
        O: "other",
        UNKNOWN: "unknown"
    };
    pGender = FHIR_GENDER[pGender.toUpperCase()];
    let pBD = dcmString(dcmJson , '00100030');
    let patientName = new HumanName();
    if (pName == undefined) {
        pName = {};
        _.set(pName, "Alphabetic", "UNKNOWN");
    } else {
        patientName.use = "usual";
    }
    patientName.text = pName.Alphabetic;
    let dicomPatientName = _.pickBy(dicomParser.parsePN(pName.Alphabetic) ,  _.identity); //remove undefined or null key
    
    patientName = patientName.toJson();
    let pJson = JSON.stringify(patientName);
    pJson = JSON.parse(pJson);
    let fhirPatientName = {
        familyName: (pJson) => {
            pJson.family = dicomPatientName.familyName;
        },
        givenName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(dicomPatientName.givenName);
            } else {
                pJson.given = [];
                pJson.given.push(dicomPatientName.givenName);
            }
        },
        middleName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(dicomPatientName.middleName);
            } else {
                pJson.given = [];
                pJson.given.push(dicomPatientName.middleName);
            }
        },
        prefix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(dicomPatientName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(dicomPatientName.middleName);
            }
        },
        suffix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(dicomPatientName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(dicomPatientName.middleName);
            }
        }
    };
    for (let key in dicomPatientName) {
        fhirPatientName[key](pJson);
    }
    let patient = 
    {
        resourceType : "Patient" , 
        id : dcmString(dcmJson , '00100020') || "unknown",
        gender : pGender , 
        active : true  ,
        name :[
            pJson
        ]
    };
    patient.id = patient.id.replace(/[\s\u0000]/gim, ""); //eslint-disable-line no-control-regex
    if (pBD) {
        patient.birthDate = moment.utc(pBD).format("YYYY-MM-DD");
    }
    return patient;
}

function dcmString(json , tag) {
    let data = _.get(json, tag);
    let value = _.get(data, "Value.0");
    return value;
}
async function getFile (filename) {
    return new Promise((resolve)=>
    {
        fs.exists(filename , function (isExist) {
            if (isExist) {
                return resolve(fs.readFileSync(filename));
            } else {
                return resolve(filename);
            }
        });
    });
}
module.exports = {
    dcm2Patient : dcm2Patient ,
    dcmJson2Patient : dcmJson2Patient
};



