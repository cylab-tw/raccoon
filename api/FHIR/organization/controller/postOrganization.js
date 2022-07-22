const mongodb = require('models/mongodb');
const hash = require('object-hash');
const { handleError } = require('../../../../models/FHIR/httpMessage');

const errorMessage = {
    "code": ""  , 
    "message" : ""
};
module.exports = async function (req, res) {
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
    };
    let insertData = req.body;
    let [status , doc]  = await insertOrganization(insertData);
    return resFunc[status](doc);
};

async function insertOrganization(insertData) {
    return new Promise(async (resolve, reject) => {
        insertData.id = hash(insertData);
        let newOrganization = new mongodb.organization(insertData);
        newOrganization.save(function (err, doc) {
            if (err) {
                errorMessage.code  = 500;
                errorMessage.message = err;
                return resolve([false ,err]);
            }
            return resolve([true, doc.getFHIRField()]);
        });
    });
}