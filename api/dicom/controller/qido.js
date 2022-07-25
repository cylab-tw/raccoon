const apiFunc = require("../../Api_function.js");
const {mongoDateQuery} = require("../../../models/mongodb/func");
const mongoFunc = require("../../../models/mongodb/func");
const {toRegex} = require("../../Api_function");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
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
                "dicomJson.00100010.Value.givenName": query.PatientName
            },
            {
                "dicomJson.00100010.Value.middleName": query.PatientName
            },
            {
                "dicomJson.00100010.Value.prefix": query.PatientName
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
        req.query = await apiFunc.refreshParam(req.query);
        let imageQuery = {};
        addPatientNameQuery(req.query, imageQuery);
        addPatientIdQuery(req.query, imageQuery);
        addModalityQuery(req.query, imageQuery);
        await addStaredQuery(req.query, imageQuery);
        addIdentifierQuery(req.query, imageQuery);
        //imageQuery = await apiFunc.refreshParam(imageQuery);
        //imageQuery = await apiFunc.cleanDoc(imageQuery);
        await toRegex(imageQuery);
        let andQuery = {
            $and : []
        };
       
        
        for (let i in imageQuery) {
            let q = {
                [i] : imageQuery[i]
            };
            andQuery.$and.push(q);
        }
        //andQuery = await apiFunc.cleanDoc(andQuery);
        if (andQuery.$and.length <= 0) andQuery = {};
        await toRegex(andQuery);
        let viewAndSearchMode = req.query.viewAndSearchMode;
        let searchModeFunc = {
            "Image" : useImageSearch , 
            "undefined" : useImageSearch
        };
        let limit = req.query.limit || 10;
        let skip = req.query.offset || 0;
        let count = await getCount(andQuery);
        let queryResult = await searchModeFunc[viewAndSearchMode](andQuery   , limit , skip);
        return res.send([queryResult , count]);
    } catch (e) {
        console.error(e);
        return res.status(500).send({message: "server wrong"});
    }
};

async function useImageSearch (imageQuery , limit , skip) {
    return new Promise (async (resolve) => {
        /*let aggregateQuery = [
            {
                $match : imageQuery
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
                                   .find(imageQuery)
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
        //let imagingStudies = await mongoFunc.aggregate_Func("ImagingStudy" , aggregateQuery);
        return resolve(imagingStudies);
    });
}

async function getCount (imageQuery) {
    return new Promise (async (resolve) => {
        let count = await mongodb.ImagingStudy.countDocuments(imageQuery);
        return resolve(count);
    });
}