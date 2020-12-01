const { VERSIONS } = require('@asymmetrik/node-fhir-server-core').constants;
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const mongodb = require('models/mongodb');
const _ = require("lodash");
const base_version  ="4_0_0";
const mongoose = require("mongoose");
let getPatient = base_version => {
    return require(resolveSchema(base_version, 'Patient'));
};

  
const errorMessage = {
    message : ""
}

module.exports = async function (req ,res) {
    console.log(req.body);
    let resFunc = {
        "true" : (data) => {
            return res.status(data.code).send(data.doc);
        } , 
        "false" : (error) => {
            return res.status(500).send(errorMessage);
        }
    }
    //let [updateStatus , doc]  = await updatePatient(req);
    let dataExist = await isDocExist(req.params.id);
    let dataFuncAfterCheckExist = {
        0 : () => {
            return ["false" , ""];
        } ,
        1 : doUpdateData , 
        2 : doInsertData
    }
    let [status , result] = await dataFuncAfterCheckExist[dataExist](req);
    return resFunc[status](result);
}

async function updatePatient (req) {
    return new Promise (async (resolve , reject) => {
        const id = req.params.id;
        mongodb["patients"].findOne ({id : id} , function (err ,doc) {
            if (err) {
                errorMessage.message = err;
                return resolve (["false" , err]);
            }
            let patientClass = getPatient(base_version);
            let patient = new patientClass(req.body);

            let clonePatient = _.cloneDeep(patient);
            let updateDoc = Object.assign(clonePatient , {_id :new mongoose.Types.ObjectId});
            if (doc) {
                delete updateDoc._id;
            }
            mongodb["patients"].findOneAndUpdate({id : id }  ,{$set : updateDoc} , {upsert : true  , new : true , rawResult: true} , function (err , newDoc) {
                if (err) {
                    errorMessage.message = err;
                    return resolve (["false" , err]);
                }
                return resolve(["true", {
                    id: id,
                    doc: newDoc.value.getFHIRField() , 
                    code : (newDoc.lastErrorObject.updatedExisting)? 200 : 201
                }]);
            });
        });
    });
}


function isDocExist (id) {
    return new Promise (async (resolve , reject) => {
        mongodb["patients"].findOne ({id : id} , async function (err ,doc) {
            if (err) {
                errorMessage.message = err;
                return resolve (0); //error
            }
            if (doc) {
                return resolve(1); //have doc
            } else {
                return resolve(2); //no doc
            }
        });
    });
}
function doUpdateData (req) {
    return new Promise((resolve , reject) => {
        let data = req.body;
        let id = req.params.id;
        delete data._id;   
        mongodb["patients"].findOneAndUpdate({id : id }  ,{$set : data} , { new : true , rawResult: true} , function (err , newDoc) {
            delete data.id;
            if (err) {
                errorMessage.message = err;
                return resolve (["false" , err]);
            }
            return resolve(["true", {
                id: id,
                doc: newDoc.value.getFHIRField() , 
                code : 200
            }]);
        });
    });
}

function doInsertData(req) {
    return new Promise ((resolve ) => {
        let data = req.body;
        data.id = req.params.id;
        let updateData = new mongodb.patients(data);
        updateData.save(function (err, doc) {
            errorMessage.message = err;
            return resolve(err ? ["false",err] : ["true", {
                code : 201 , 
                doc: doc.getFHIRField()
            }]);
        });
    });
}