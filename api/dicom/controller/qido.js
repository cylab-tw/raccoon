const api_func = require("../../Api_function.js");
const {mongoDateQuery} = require("../../../models/mongodb/func");
const mongoFunc = require("../../../models/mongodb/func");
const {ToRegex} = require("../../Api_function");
const _ = require('lodash');
const mongodb = require("../../../models/mongodb/index.js");

module.exports = async function (req ,res)
{
    try {
        let image_Query = {
            $or : [
                {
                    "dicomJson.00100010.Value.Alphabetic" : req.query.PatientName 
                }, 
                {
                    "dicomJson.00100010.Value.familyName" : req.query.PatientName 
                },
                {
                    "dicomJson.00100010.Value.givenName" : req.query.PatientName ,
                } ,
                {
                    "dicomJson.00100010.Value.middleName" : req.query.PatientName ,
                } ,
                {
                    "dicomJson.00100010.Value.prefix" : req.query.PatientName ,
                },
                {
                    "dicomJson.00100010.Value.suffix" : req.query.PatientName 
                }
            ] ,
            "started":req.query.StudyDate ,
            "series.modality.code":req.query.ModalitiesInStudy , 
            "identifier.value" : req.query.StudyInstanceUID ,
            "subject.reference" : req.query.PatientID 
        };
        image_Query = await api_func.Refresh_Param(image_Query);
        image_Query = await api_func.cleanDoc(image_Query);
       // await ToRegex(image_Query);
        let andQuery = {
            $and : []
        };
       
        await mongoDateQuery(image_Query,"started",true);
        for (let i in image_Query) {
            let q = {
                [i] : image_Query[i]
            };
            andQuery.$and.push(q);
        }
        andQuery = await api_func.cleanDoc(andQuery);
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
        let aggregate_Query = [
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
        ];
        let imagingStudies = await mongoFunc.aggregate_Func("ImagingStudy" , aggregate_Query);
        console.log(JSON.stringify(aggregate_Query , null ,4) );
        return resolve(imagingStudies);
    });
}

async function getCount (image_Query) {
    return new Promise (async (resolve) => {
        let count = await mongodb.ImagingStudy.find(image_Query).count();
        return resolve(count);
    });
}