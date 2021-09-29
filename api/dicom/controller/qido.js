const api_func = require("../../Api_function.js");
const {mongoDateQuery} = require("../../../models/mongodb/func");
const mongoFunc = require("../../../models/mongodb/func");
const {ToRegex} = require("../../Api_function");
const _ = require('lodash');
const mongodb = require("../../../models/mongodb/index.js");


function addPatientNameQuery (query, imageQuery) {
    if (_.get(query, "PatientName", false)) {
        _.set(imageQuery, "$or",[
            {
                "dicomJson.00100010.Value.Alphabetic": query.PatientName
            },
            {
                "dicomJson.00100010.Value.familyName": query.PatientName
            },
            {
                "dicomJson.00100010.Value.givenName": query.PatientName,
            },
            {
                "dicomJson.00100010.Value.middleName": query.PatientName,
            },
            {
                "dicomJson.00100010.Value.prefix": query.PatientName,
            },
            {
                "dicomJson.00100010.Value.suffix": query.PatientName
            }
        ]);
    }
}

function addPatientIdQuery(query, imageQuery) {
    if (_.get(query, "PatientID", false)) {
        imageQuery["subject.reference"] = query.PatientID;
    }
}

async function addStaredQuery(query, imageQuery) {
    if (_.get(query, "StudyDate", false)) {
        imageQuery["started"] = query.StudyDate;
    }
    await mongoDateQuery(imageQuery, "started", false);
}

function addModalityQuery(query, imageQuery) {
    if (_.get(query, "ModalitiesInStudy", false)) {
        imageQuery["series.modality.code"] = query.ModalitiesInStudy;
    }
}

function addIdentifierQuery(query, imageQuery) {
    if (_.get(query, "StudyInstanceUID", false)) {
        imageQuery["identifier.value"] = query.StudyInstanceUID;
    }
}

module.exports = async function (req ,res)
{
    try {
        req.query = await api_func.Refresh_Param(req.query);
        let image_Query = {};
        addPatientNameQuery(req.query, image_Query);
        addPatientIdQuery(req.query, image_Query);
        addModalityQuery(req.query, image_Query);
        await addStaredQuery(req.query, image_Query);
        addIdentifierQuery(req.query, image_Query);
        //image_Query = await api_func.Refresh_Param(image_Query);
        //image_Query = await api_func.cleanDoc(image_Query);
        await ToRegex(image_Query);
        let andQuery = {
            $and : []
        };
       
        
        for (let i in image_Query) {
            let q = {
                [i] : image_Query[i]
            };
            andQuery.$and.push(q);
        }
        //andQuery = await api_func.cleanDoc(andQuery);
        if (andQuery.$and.length <= 0) andQuery = {};
        await ToRegex(andQuery);
        let viewAndSearchMode = req.query.viewAndSearchMode;
        let searchModeFunc = {
            "Image" : useImageSearch , 
            "undefined" : useImageSearch
        }
        let limit = req.query.limit || 10;
        let skip = req.query.offset || 0;
        let count = await getCount(andQuery);
        let queryResult = await searchModeFunc[viewAndSearchMode](andQuery   , limit , skip);
        return res.send([queryResult , count]);
    } catch (e) {
        console.error(e);
        return res.status(500).send({message: "server wrong"});
    }
}

async function useImageSearch (image_Query , limit , skip) {
    return new Promise (async (resolve) => {
        /*let aggregate_Query = [
            {
                $match : image_Query
            } ,
            {
                $lookup :
                {
                    from : "patients" ,
                    localField : "subject.identifier.value" ,
                    foreignField : "id"  ,
                    as : "patient"
                }
            } ,
            {
                $limit : parseInt(skip) + parseInt(limit)
            } ,
            {
                $skip : parseInt(skip)
            }
        ];*/
        let imagingStudies = await mongodb.ImagingStudy
                                   .find(image_Query)
                                   .sort({'_id' : 1})
                                   .skip(skip)
                                   .limit(limit)
                                   .exec();
        for (let i in imagingStudies) {
            let imaging = imagingStudies[i];
            let hitPatient = await mongodb.patients.findOne({
                "id" : imaging.subject.identifier.value
            });
            imagingStudies[i].patient = hitPatient;
        }
        //let imagingStudies = await mongoFunc.aggregate_Func("ImagingStudy" , aggregate_Query);
        return resolve(imagingStudies);
    });
}

async function getCount (image_Query) {
    return new Promise (async (resolve) => {
        let count = await mongodb.ImagingStudy.countDocuments(image_Query);
        return resolve(count);
    });
}