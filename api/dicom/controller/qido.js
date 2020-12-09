const api_func = require("../../Api_function.js");
const {mongoDateQuery} = require("../../../models/mongodb/func");
const mongoFunc = require("../../../models/mongodb/func");
const {ToRegex} = require("../../Api_function");
const {textSpaceToOrCond} = require("../../Api_function");
const _ = require('lodash');
const mongodb = require("../../../models/mongodb");

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
        let aggregate_Query = [
            {
                $match : image_Query
            } ,
            {
                $count : "count"
            }
        ];
        let count = await mongodb.ImagingStudy.find(image_Query).count();
        return resolve(count);
    });
}




function useReportSearch (image_Query,patient_Query,record_Query) {
    return new Promise (async (resolve) => {
        record_Query["Records.FULLTEXT"] = record_Query["Records.Records.FULLTEXT"];
        delete record_Query["Records.Records.FULLTEXT"];
        let aggregate_Query = [
            {
                $match : record_Query
            } ,
            {
                $lookup :
                {
                    from : "patients" ,
					let : {"pID" : "$pID"} , 
					pipeline : [
						{$match : {"$expr" : {"$eq" : [{$concat:["p" ,"$id"]} , {$concat:["$$pID"]}]}}}
					] , 
                    as : "patient"
                }
            },
            {
                $match : patient_Query
            },
            {
                $lookup :
                {
                    from : "imagingstudies" ,
                    let : {"sID" : "$sID"} ,
                    pipeline : [
                        {
                            $addFields : {
                                "newIden" : "$identifier"
                            }
                        },
                        {
                            $unwind : "$identifier"
                        } ,
                        {
                            $match : {
                                "$expr" : {
                                    "$eq" : ["$identifier.value" , "$$sID"]
                                }
                            }
                        } ,
                        {
                            $project : {
                                subject : 1 , 
                                started : 1 ,
                                series : 1 ,
                                dicomJson : 1 ,
                                id : 1 ,
                                identifier : "$newIden"
                            }
                        }
                    ] ,
                    as : "ImagingStudy"
                }
            },
            {
                $unwind: {
                    "path" : "$ImagingStudy" , 
                    "preserveNullAndEmptyArrays" : true
                }
            },
            {
                $match : image_Query
            } ,
            {
                $addFields : {
                    "Records" : "$$ROOT"
                }
            },
            {
                $replaceRoot: {
                    newRoot : {$mergeObjects:["$$ROOT","$ImagingStudy"]}
                } 
            } 
        ];
        let report = await mongoFunc.aggregate_Func("Records" , aggregate_Query);
        return resolve(report);
    });
}