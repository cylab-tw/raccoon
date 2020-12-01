'use strict';
const mongodb = require('models/mongodb');
const _ = require('lodash');
const {createBundle} = require('models/FHIR/func');
const FHIRFilter = {
    _id: 0,
    __v: 0,
    'identifier._id': 0,
    'subject._id' : 0 ,
    'subject.identifier._id' : 0 ,
    'series.modality._id' : 0 ,
    'series.bodySite._id' : 0 ,
    'series._id': 0,
    'series.instance._id': 0,
    'series.instance.store_path': 0,
    'dicomJson': 0,
    'series.dicomJson': 0,
    'series.instance.dicomJson': 0 , 
    'series.instance.metadata' : 0 ,
    report : 0 , 
    patient : 0
}
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
        if (!queryParameter[key] || (_.isObject(queryParameter[key])) || key=="_include") {
            delete queryParameter[key];
        }
    });
    queryParameter.$and = [];
    Object.keys(queryParameter).forEach(key => {
        try {
            paramsSearch[key](queryParameter);
        } catch (e) {

        }
    });
    if (queryParameter.$and.length == 0) {
        delete queryParameter["$and"];
    }
    const sendRes = {
        "true": (data) => res.status(200).json(data),
        "false": () => res.status(500).json({ "message": "error" })
    }
    let [status, result] = await defaultSearch(queryParameter , paginationSkip , realLimit);
    let _include = _.get(req.query , "_include");
    if (_include) {
        if (typeof _include == "string")  {
            _include = [_include];
        } 
        for (let i of _include) {
            await includeSearch[i](result);
        }
    }
    let count = await mongodb.ImagingStudy.countDocuments(queryParameter);
    let bundle = createBundle(req , result , count , paginationSkip , paginationLimit , "ImagingStudy");
    return sendRes[status](bundle);
};

async function defaultSearch(query , skip , limit) {
    return new Promise((resolve, reject) => {
        mongodb.ImagingStudy.find(query, FHIRFilter)
        .limit(limit)
        .skip(skip)
        .exec((err, result) => {
            if (err) {
                return reject(["false", undefined]);
            }
            return resolve(["true", result]);
        });
    });
}
const includeSearch = {
    "ImagingStudy:patient" :async (result) =>{
        let patients = [];
        for (let i of result) {
            let patientId = _.get(i ,"subject.reference");
            if (_.isUndefined(patientId)) continue;
            patientId = patientId.replace(/patient\//gi ,"");
            let patient = await mongodb.patients.findOne({id : patientId}).exec();
            if (patient)  {
                patients.push(patient.getFHIRField());
            }
        }
        result.push(...patients);
    } ,
    "ImagingStudy:endpoint" : async (result) =>{
        let endpoints = [];
        for (let i of result) {
            let endpointId = _.get(i ,"endpoint.reference");
            if (_.isUndefined(endpointId)) continue;
            endpointId = endpointId.replace(/endpoint\//gi ,"");
            let endpoint = await mongodb.endpoint.findOne({id : endpointId}).exec();
            if (endpoint)  {
                endpoint.push(endpoint);
            }
        }
        result.push(...endpoints);
    }
}

const paramsSearch = {
    "_id" : (query) => {
        query.$and.push({
            id : query["_id"]
        });
        delete query["_id"];
    }
}