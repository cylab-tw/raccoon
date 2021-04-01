const dicomParser= require("dicom-parser");
const fs = require('fs');
const path = require('path');
const _ =require("lodash");
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
    ToJson()
    {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {}); 
    }
}

async function DCM2Patient(filename)
{
    let dicomfile = await getFile(filename);
    let dataset = dicomParser.parseDicom(dicomfile);
    let pName = dataset.string('x00100010');
    let pGender = dataset.string('x00100040') || "unknown";
    let FHIRGender = {
        "M" : "male" , 
        "F" : "female" , 
        "O" : "other" , 
        "UNKNOWN" : "unknown"
    }
    pGender = FHIRGender[pGender.toUpperCase()];
    let pBD = dataset.string('x00100030');
    let patientName = new HumanName();
    if (pName == undefined) {
        pName = "UNKNOWN"
    } else {
        patientName.use = "usual";
    }
    patientName.text = pName;
    let DICOMpName = _.pickBy(dicomParser.parsePN(pName) ,  _.identity); //remove undefined or null key
    
    patientName = patientName.ToJson();
    let pJson = JSON.stringify(patientName);
    pJson = JSON.parse(pJson);
    let FHIRpName = {
        familyName: (pJson) => {
            pJson.family = DICOMpName.familyName;
        },
        givenName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(DICOMpName.givenName);
            } else {
                pJson.given = [];
                pJson.given.push(DICOMpName.givenName);
            }
        },
        middleName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(DICOMpName.middleName);
            } else {
                pJson.given = [];
                pJson.given.push(DICOMpName.middleName);
            }
        },
        prefix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(DICOMpName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(DICOMpName.middleName);
            }
        },
        suffix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(DICOMpName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(DICOMpName.middleName);
            }
        }
    }
    for (let key in DICOMpName) {
        FHIRpName[key](pJson);
    }
    let Patient = 
    {
        resourceType : "Patient" , 
        id : dataset.string('x00100020'),
        gender : pGender , 
        active : true  ,
        name :[
            pJson
        ]
    }
    if (pBD) {
        Patient.birthDate = moment.utc(pBD).format("YYYY-MM-DD");
    }
    //console.log(Patient);
    return Patient;
}
function DCMJson2Patient(dcmJson)
{
    let pName = dcmString(dcmJson , '00100010');
    let pGender = dcmString(dcmJson , '00100040') || "unknown";
    let FHIRGender = {
        "M" : "male" , 
        "F" : "female" , 
        "O" : "other" , 
        "UNKNOWN" : "unknown"
    }
    pGender = FHIRGender[pGender.toUpperCase()];
    let pBD = dcmString(dcmJson , '00100030');
    let patientName = new HumanName();
    if (pName == undefined) {
        pName = "UNKNOWN"
    } else {
        patientName.use = "usual";
    }
    patientName.text = pName.Alphabetic;
    let DICOMpName = _.pickBy(dicomParser.parsePN(pName.Alphabetic) ,  _.identity); //remove undefined or null key
    
    patientName = patientName.ToJson();
    let pJson = JSON.stringify(patientName);
    pJson = JSON.parse(pJson);
    let FHIRpName = {
        familyName: (pJson) => {
            pJson.family = DICOMpName.familyName;
        },
        givenName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(DICOMpName.givenName);
            } else {
                pJson.given = [];
                pJson.given.push(DICOMpName.givenName);
            }
        },
        middleName: (pJson) => {
            if (pJson.given) {
                pJson.given.push(DICOMpName.middleName);
            } else {
                pJson.given = [];
                pJson.given.push(DICOMpName.middleName);
            }
        },
        prefix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(DICOMpName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(DICOMpName.middleName);
            }
        },
        suffix: (pJson) => {
            if (pJson.prefix) {
                pJson.prefix.push(DICOMpName.middleName);
            } else {
                pJson.prefix = [];
                pJson.prefix.push(DICOMpName.middleName);
            }
        }
    }
    for (let key in DICOMpName) {
        FHIRpName[key](pJson);
    }
    let Patient = 
    {
        resourceType : "Patient" , 
        id : dcmString(dcmJson , '00100020'),
        gender : pGender , 
        active : true  ,
        name :[
            pJson
        ]
    }
    Patient.id = Patient.id.replace(/[\s\u0000]/gim , '');
    if (pBD) {
        Patient.birthDate = moment.utc(pBD).format("YYYY-MM-DD");
    }
    //console.log(Patient);
    return Patient;
}

function dcmString(json , tag) {
    let data = _.get(json, tag);
    //console.log("d" , data);
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
    DCM2Patient : DCM2Patient ,
    DCMJson2Patient : DCMJson2Patient
}



