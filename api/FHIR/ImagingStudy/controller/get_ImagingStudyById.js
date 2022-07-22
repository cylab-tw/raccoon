const mongodb = require('models/mongodb');
const {handleError} = require('../../../../models/FHIR/httpMessage');

module.exports = async function (req, res) {
    
    const FHIRFilter = {
        _id:0 , 
        __v:0 , 
        'identifier._id' :0 , 
        'series._id':0 , 
        'series.instance._id':0  ,
        'series.instance.store_path' :0 ,
        'dicomJson' : 0 , 
        'series.dicomJson' : 0  ,
        'series.instance.dicomJson' : 0 ,
        'series.instance.metadata' : 0 ,
        report : 0 , 
        patient : 0
    };
    let id = req.params.id;
    try {
        let docs = await mongodb.ImagingStudy.findOne({id : id} , FHIRFilter).exec();
        if (docs) {
            return res.status(200).json(docs);    
        }
        let errorMessage = `not found ImagingStudy/${id}`;
        return res.status(404).json(handleError["not-found"](errorMessage));
    } catch (e) {
        console.log('api api/fhir/ImagingStudy/:id has error, ', e);
        return res.status(500).json(handleError.exception('server has something error'));
    }
};