const {getContent , patient} = require('../../es/controller/search');
const es = require('../../../models/elasticsearch');
module.exports = async function (req , res) {
    let id = req.params.id;
    if (!id) return res.status(204).send(); 
    let imagingstudy = await es.esclient.search({
        index : "my-testimagingstudy" , 
        body : {
            query : {
                term : {
                    id : id
                }
            }
        }
    });
    imagingstudy = imagingstudy.body.hits.hits[0]._source;
    imagingstudy = await  getContent([imagingstudy]);
    let patientImagingstudy = await patient.getImagingStudy(req , imagingstudy[0])
    return res.send(patientImagingstudy);
}