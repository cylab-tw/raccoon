'use strict';
const mongodb = require('models/mongodb');
const mongoFunc = require('models/mongodb/func');
const mongoose = require('mongoose');

const fhirFilter = {
    _id: 0,
    __v: 0,
    'identifier._id': 0,
    'subject._id': 0,
    'subject.identifier._id': 0,
    'series.modality._id': 0,
    'series.bodySite._id': 0,
    'series._id': 0,
    'series.instance._id': 0,
    'series.instance.store_path': 0,
    'dicomJson': 0,
    'series.dicomJson': 0,
    'series.instance.dicomJson': 0,
    'series.instance.metadata': 0,
    report: 0,
    patient: 0
};
module.exports = async function (req, res) {
    let reqData = req.body;
    let sendData =
    {
        "true": (data) => {
            res.status(201).json(data);
        },
        "false": (error) => {
            res.status(500).json(error);
        }
    };
    delete reqData["_id"];
    let { status, data } = await updateImagingStudy({ id: req.params.id }, reqData);
    let updatedDoc = await mongodb.ImagingStudy.findOne({
        _id : data.value._doc._id
    }, fhirFilter);
    return sendData[status.toString()](updatedDoc);
};


async function updateImagingStudy(query, iData) {
    try {
        let doc = await mongodb.ImagingStudy.findOneAndUpdate(query, { $set: iData } , {new:true  ,upsert: true , rawResult : true});
        return {
            status: true,
            data: doc
        };
    } catch(e) {
        console.error(e);
        return {
            status: false,
            data: e
        };
    }
}

module.exports.updateImagingStudy = updateImagingStudy;