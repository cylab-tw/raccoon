const mongodb = require('models/mongodb');
const _ = require("lodash");
const mongoose = require("mongoose");
const base_version  ="4_0_0";
const {cleanDoc}  =require("api/Api_function")



const errorMessage = {
    message : ""
}

module.exports = async function (req , res) {
    let resFunc = {
        "true" : (data) => {
            return res.status(200).send(data);
        } , 
        "false" : (error) => {
            return res.status(500).send(errorMessage);
        }
    }
    let dataExist = await isDocExist(req.params.id);
    let dataFuncAfterCheckExist = {
        0 : () => {
            return ["false" , ""];
        } ,
        1 : doUpdateData , 
        2 : doInsertData
    }
    let [ status , result] = await dataFuncAfterCheckExist[dataExist](req);
    return resFunc[status](result);
}
function isDocExist (id) {
    return new Promise (async (resolve , reject) => {
        mongodb["endpoint"].findOne ({id : id} , async function (err ,doc) {
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
        mongodb["endpoint"].findOneAndUpdate({id : id }  ,{$set : data} , { new : true , rawResult: true} , function (err , newDoc) {
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
        let updateData = new mongodb.endpoint(data);
        updateData.save(function (err, doc) {
            errorMessage.message = err;
            return resolve(err ? ["false",err] : ["true", {
                code : 201 , 
                doc: doc.getFHIRField()
            }]);
        });
    });
}
