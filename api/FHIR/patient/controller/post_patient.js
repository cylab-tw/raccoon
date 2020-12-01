const mongodb = require('models/mongodb');
const hash = require('object-hash');
const { handleError } = require('../../../../models/FHIR/httpMessage');
const uuid = require('uuid');
const errorMessage = {
    "code": ""  , 
    "message" : ""
};
module.exports = async function (req, res) {
    console.log(req.body);
    try {
        let resFunc = {
            "true" : (doc) => {
                return res.status(201).send(doc);
            } , 
            "false" : (doc) => {
                if (errorMessage.message.code == 11000) {
                    return res.status(409).json(handleError.duplicate(errorMessage.message));
                }
                return res.status(500).send(handleError.exception(errorMessage.message));
            }
        }
        let Insert_Data = req.body;
        let [status , doc]  = await Insert_Patient(Insert_Data);
        return resFunc[status](doc);
    } catch(e) {
        console.error(`error`);
        console.log(e);
    }
}

async function Insert_Patient(Insert_Data) {
    return new Promise(async (resolve, reject) => {
        try {
            Insert_Data.id = uuid.v4();
            let New_Patient = new mongodb.patients(Insert_Data);
            New_Patient.save(function (err, doc) {
                if (err) {
                    errorMessage.message = err;
                    return resolve([false ,err]);
                }
                return resolve([true, doc.getFHIRField()]);
            });
        } catch (e) {
            console.error(e);
        }
    });
}