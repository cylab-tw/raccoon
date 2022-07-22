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
    };
    let insertData = req.body;
    let [status , doc]  = await insertImagingStudy(insertData);
    return resFunc[status](doc);
};


async function insertImagingStudy(insertData) {
    try {
        insertData.id = hash(insertData);
        let imagingStudy = new mongodb.ImagingStudy(insertData);
        let savedDoc = await imagingStudy.save();
        return [true, savedDoc];
    } catch(e) {
        errorMessage.message = e;
        return [false, e];
    }
}