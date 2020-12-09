'use strict';

const humanNameSchema = require('../FHIRmodel/HumanName');
const identifierSchema = require('../FHIRmodel/Identifier');
const contactPointSchema = require('../FHIRmodel/ContactPoint');
const addressSchema = require('../FHIRmodel/Address');
const refernceSchema = require('../FHIRmodel/Reference');
const moment = require('moment');
const {isArray , set} = require('lodash');
const fs = require('fs');
module.exports = function(mongodb) {
  require('mongoose-schema-jsonschema')(mongodb);
  const patientsSchema = mongodb.Schema({
    resourceType: {
      type: String ,
      default : "Patient"
    },
    id: {
      type: String , 
      index : true , 
      unique : true
    },
    identifier : {
      type : [identifierSchema],
      default : void 0
    } ,
    active: {
      type: Boolean ,
      default : false
    },
    name: {
      type : [humanNameSchema] ,
      default : void 0
    } ,
    telecom : {
      type : [contactPointSchema] , 
      default : void 0
    },
    gender :{
      type : String ,
      default : void 0
    } ,
    birthDate : {
      type : Date ,
      default : void 0
    },
    address : {
      type : [addressSchema] , 
      default : void 0
    }  , 
    managingOrganization : {
      type : refernceSchema , 
      default : void 0
    }
  });
  patientsSchema.index({
    "id" : 1
    } , {
      unique : true
    });
  patientsSchema.index({
    "name.text" : 1
  });
  patientsSchema.methods.getFHIRField = function () {
    let result =  this.toObject();
    delete result._id;
    let version = result.__v;
    if (version) {
      set(result , 'meta.versionId' , version.toString());
    }
    delete result.__v;
    delete result['name._id'];
    if (result.birthDate) {
      result.birthDate = moment(result.birthDate).format('YYYY-MM-DD');
    }
    return result;
  }
  patientsSchema.post('findOneAndUpdate' , async function (result) {
    if (result.value) {
      result.value.__v++;
      await result.value.save();
    } else {
      result.__v++;
      await result.save();
    }
    return result;
  })
  //fs.writeFileSync("./data/patient.json" ,JSON.stringify (patientsSchema.jsonSchema() , null ,4) , {flag: "w+"});
  const patients = mongodb.model('patients', patientsSchema);
  return patients;
};

