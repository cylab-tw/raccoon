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
module.exports.DCM2Patient = DCM2Patient;


