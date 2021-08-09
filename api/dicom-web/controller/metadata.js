const mongodb = require('models/mongodb');
const _ =require('lodash');
const mongoFunc = require('../../../models/mongodb/func');


const returnProject = {
    $project : {
        _id : 0 , 
        __v : 0 ,
        studyUID : 0 ,
        seriesUID : 0 ,
        instanceUID : 0
    }
};

module.exports = async function (req , res ) {
    let getMetaFunc = [getStudyMetadata , getSeriesMetadata , getInstanceMetadata];
    let errorMessage = {
        message : "cannot found"
    }
    let keys = Object.keys(req.params);
    let item = await getMetaFunc[keys.length -1](req.params);
    for (let i of keys) {
        errorMessage.message = `${errorMessage.message} ${keys}:${req.params[i]}`
    }
    if (item.length <= 0) return res.status(404).json(errorMessage);
    if (item[0].metadata) {
        if (item[0].metadata.length > 0) {
            res.setHeader('Content-Type' , 'application/dicom+json');
            return res.send(item[0].metadata);
        }
    }
    res.setHeader('Content-Type' , 'application/dicom+json');
    return res.status(404).json(errorMessage);
}

async function getStudyMetadata (params) {
    const metadataQuery = [
        {
            $match : {
                $and : [
                    {
                        studyUID : params.studyID
                    }
                ]
                
            } 
        } ,
        returnProject
         , 
        {
            $group : {
                "_id" : "$seriesUID" , 
                "metadata" : {
                    $push : "$$ROOT"
                }
            }
        }
    ]
    let agg = await mongoFunc.aggregate_Func("dicomMetadata" , metadataQuery)
    return agg;
}
async function getSeriesMetadata (params) {
    const metadataQuery = [
        {
            $match : {
                $and : [
                    {
                        studyUID : params.studyID
                    } ,
                    {
                        seriesUID : params.seriesID
                    }
                ]
                
            } 
        } ,
        returnProject
         , 
        {
            $group : {
                "_id" : "$seriesUID" , 
                "metadata" : {
                    $push : "$$ROOT"
                }
            }
        }
    ]
    
    let agg = await mongoFunc.aggregate_Func("dicomMetadata" , metadataQuery)
    return agg;
}
async function getInstanceMetadata (params) {
    const metadataQuery = [
        {
            $match : {
                $and : [
                    {
                        studyUID : params.studyID
                    } ,
                    {
                        seriesUID : params.seriesID
                    } ,
                    {
                        instanceUID : params.instanceID
                    }
                ]
                
            } 
        } ,
        returnProject
        , 
        {
            $group : {
                "_id" : "$instanceUID" , 
                "metadata" : {
                    $push : "$$ROOT"
                }
            }
        }
    ]
    let agg = await mongoFunc.aggregate_Func("dicomMetadata" , metadataQuery)
    return agg;
}