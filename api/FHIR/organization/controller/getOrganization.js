const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const mongodb = require('models/mongodb');
const {createBundle} = require('models/FHIR/func');
const queryBuild = require('models/FHIR/queryBuild.js');
const FHIRFilter = {
    _id: 0,
    __v: 0
};
module.exports = async function (req, res) {
    let queryParameter =  _.cloneDeep(req.query);
    let paginationSkip = queryParameter['_offset'] == undefined ? 0 : queryParameter['_offset'];
    let paginationLimit = queryParameter['_count'] == undefined ? 100 : queryParameter['_count'];
    _.set(req.query , "_offset" ,paginationSkip);
    _.set(req.query , "_count" , paginationLimit);
    let realLimit = paginationLimit+ paginationSkip;
    delete queryParameter['_count'];
    delete queryParameter['_offset'];
    Object.keys(queryParameter).forEach(key => {
        if (!queryParameter[key] || _.isObject(queryParameter[key])) {
            delete queryParameter[key];
        }
    });
    queryParameter.$and = [];
    Object.keys(queryParameter).forEach(key => {
        try {
            paramsSearch[key](queryParameter);
        } catch (e) {
            if (key != "$and") delete queryParameter[key];
        }
    });
    if (queryParameter.$and.length == 0) {
        delete queryParameter["$and"];
    }
    try {
        let docs = await mongodb.organization.find(queryParameter ,FHIRFilter).
        limit(realLimit).
        skip(paginationSkip).
        exec();
        let count = await mongodb.organization.countDocuments(queryParameter);
        let bundle = createBundle(req , docs , count , paginationSkip , paginationLimit , "Organization");
        return res.status(200).json(bundle);
    } catch (e) {
        console.log('api api/fhir/organization/ has error, ', e);
        return res.status(500).json({
            message: 'server has something error'
        });
    }
};

const paramsSearch = {
    "_id" : (query) => {
        query.$and.push({
            id : query["_id"]
        });
        delete query["_id"];
    }  ,
    "identifier" : (query) => {
        let buildResult = queryBuild.tokenQuery(query["identifier"] , "value" , "identifier" ,"");
        for (let i in buildResult) {
            query.$and.push({
                [i] : buildResult[i]
            });
        }
        delete query['identifier'];
    } 
};