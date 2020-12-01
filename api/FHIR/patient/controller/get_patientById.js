const mongodb = require('models/mongodb');
const {handleError} = require('../../../../models/FHIR/httpMessage');
module.exports = async function (req, res) {
    
    const FHIRFilter = {
        _id: 0,
        __v: 0,
        'name._id': 0
    }
    let id = req.params.id;
    try {
        let docs = await mongodb.patients.findOne({id : id} , FHIRFilter).exec();
        if (docs) {
            return res.status(200).json(docs.getFHIRField());    
        }
        let errorMessage = `not found Patient/${id}`;
        return res.status(404).json(handleError["not-found"](errorMessage));
    } catch (e) {
        console.log('api api/fhir/patient/:id has error, ', e)
        return res.status(500).json(handleError.exception('server has something error'));
    }
};