const mongodb = require('models/mongodb');
const hash = require('object-hash');
const { handleError } = require('../../../../models/FHIR/httpMessage');


const errorMessage = {
    "message" : ""
};

module.exports = async function (req, res) {
    let resFunc = {
        "true" : (data) => {
            return res.status(200).send(data);
        } , 
        "false" : (error) => {
            if (errorMessage.message.code == 11000) {
                return res.status(409).json(handleError.duplicate(errorMessage.message));
            }
            return res.status(500).send(handleError.exception(errorMessage.message));
        }
    };
    let Insert_Data = req.body;
    let [status , doc]  = await insertEndpoint(Insert_Data);
    return resFunc[status](doc);
};

async function insertEndpoint(req) {
    return new Promise(async (resolve, reject) => {
        Insert_Data.id = hash(Insert_Data);
        let newEndpoint = new mongodb.endpoint(Insert_Data);
        newEndpoint.save(function (err, doc) {
            if (err) {
                errorMessage.code  = 500;
                errorMessage.message = err;
                return resolve([false ,err]);
            }
            return resolve([true, doc.getFHIRField()]);
        });
    });
}