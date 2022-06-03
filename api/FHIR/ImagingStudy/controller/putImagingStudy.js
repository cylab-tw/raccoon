'use strict';
const mongodb = require('models/mongodb');
const mongoFunc = require('models/mongodb/func');
const mongoose = require('mongoose');

const FHIRFilter = {
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
}
module.exports = async function (req, res) {
    let reqData = req.body;
    let sendData =
    {
        "true": (data) => {
            res.status(201).json(data)
        },
        "false": (error) => {
            res.status(500).json(error)
        }
    }
    delete reqData["_id"];
    let [updateStatus, doc] = await mongoUpdate({ id: req.params.id }, reqData);
    let updatedDoc = await mongodb.ImagingStudy.findOne({
        _id : doc.value._doc._id
    }, FHIRFilter);
    return sendData[updateStatus.toString()](updatedDoc);
};
module.exports.putFHIRImagingStudyWithoutReq = async function (id , data) {
    delete data["_id"];
    let [updateStatus, doc] = await mongoUpdate({ id: id }, data);
    if (updateStatus) {
        return doc.value.id;
    }
    return false;
} 
async function mongoUpdate(query, data) {
    return new Promise((resolve , reject) => {
        mongodb.ImagingStudy.findOneAndUpdate(query, { $set: data } , {new:true  ,upsert: true , rawResult : true}, function (err, doc) {
            if (err) {
                console.error(err);
                return reject([false , err]);
            } 
            return resolve([true, doc]);
        });
    });
}