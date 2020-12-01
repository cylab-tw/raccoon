const mongoFunc = require('models/mongodb/func');
const _ = require('lodash');
const { createBundle } = require('models/FHIR/func');
const mongodb = require('models/mongodb');
module.exports = async function (req, res) {
    let queryParameter = _.cloneDeep(req.query);
    let paginationSkip = queryParameter['_offset'] == undefined ? 0 : queryParameter['_offset'];
    let paginationLimit = queryParameter['_count'] == undefined ? 100 : queryParameter['_count'];
    _.set(req.query, "_offset", paginationSkip);
    _.set(req.query, "_count", paginationLimit);
    let realLimit = paginationLimit + paginationSkip;
    delete queryParameter['_count'];
    delete queryParameter['_offset'];
    Object.keys(queryParameter).forEach(key => {
        if (!queryParameter[key] || _.isObject(queryParameter[key])) {
            delete queryParameter[key];
        }
    });

    const FHIRFilter = {
        _id: 0 ,
        __v: 0 ,
        "connectionType._id": 0 ,
        "payloadType._id": 0
    }
    if (req.params.id) {
        queryParameter['id'] = req.params.id;
    }
    try {
        let docs = await mongodb.endpoint.find(queryParameter, FHIRFilter).
            limit(realLimit).
            skip(paginationSkip).
            exec();
        let count = await mongodb.endpoint.countDocuments(queryParameter);
        let bundle = createBundle(req, docs, count, paginationSkip, paginationLimit, "Endpoint");
        return res.status(200).json(bundle);
    } catch (e) {
        console.log('api /api/fhir/Endpointhas error, ', e)
        return res.status(500).json({
            message: 'server has something error'
        });
    }
};