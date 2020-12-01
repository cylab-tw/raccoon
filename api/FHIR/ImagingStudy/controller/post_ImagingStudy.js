const mongodb = require('models/mongodb');
const hash = require('object-hash');
const { handleError } = require('../../../../models/FHIR/httpMessage');
const errorMessage = {
    "code": ""  , 
    "message" : ""
};

module.exports = async (req, res) => {
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
    let [status , doc]  = await InsertImagingStudy(Insert_Data);
    return resFunc[status](doc);
}


async function InsertImagingStudy(Insert_Data) {
    return new Promise(async (resolve, reject) => {
        Insert_Data.id = hash(Insert_Data);
        let ImagingStudy = new mongodb.ImagingStudy(Insert_Data);
        await ImagingStudy.save(function (err, doc) {
            if (err) {
                errorMessage.message = err;
                return resolve([false ,err]);
            }
            return resolve([true, doc]);
        });
    });
}