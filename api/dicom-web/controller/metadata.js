const mongodb = require('models/mongodb');
const mongoFunc = require('../../../models/mongodb/func');

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
    const query = [
        {
            $match : {
                "dicomJson.0020000D": params.studyID
            } 
        } , 
        {
            $unwind : "$series"
        } , 
        {
            $unwind : "$series.instance"
        } , 
        {
            $match : {
                "id": params.studyID
            }
        } , 
        {
            $group : {
                "_id" : "$_id" , 
                "metadata" : {
                    $push : "$series.instance.metadata"
                }
            }
        }
    ];
    let agg = await mongoFunc.aggregate_Func("ImagingStudy" , query)
    return agg;
}
async function getSeriesMetadata (params) {
    const query = [
        {
            $match : {
                "dicomJson.0020000D": params.studyID
            } 
        } , 
        {
            $unwind : "$series"
        } , 
        {
            $unwind : "$series.instance"
        } , 
        {
            $match : {
                "series.uid": params.seriesID
            }
        } , 
        {
            $group : {
                "_id" : "$_id" , 
                "metadata" : {
                    $push : "$series.instance.metadata"
                }
            }
        }
    ];
    let agg = await mongoFunc.aggregate_Func("ImagingStudy" , query)
    return agg;
}
async function getInstanceMetadata (params) {
    const query = [
        {
            $match : {
                "dicomJson.0020000D" : params.studyID
            } ,
            $match : {
                "series.uid" : params.seriesID
            } ,
            $match : {
                "series.instance.uid": params.instanceID
            }
        } , 
        {
            $unwind : "$series"
        } , 
        {
            $unwind : "$series.instance"
        } , 
        {
            $match : {
                "series.instance.uid": params.instanceID
            }
        } , 
        {
            $group : {
                "_id" : "$_id" , 
                "metadata" : {
                    $push : "$series.instance.metadata"
                }
            }
        }
    ];
    console.log(JSON.stringify(query , null , 4));
    let agg = await mongoFunc.aggregate_Func("ImagingStudy" , query)
    return agg;
}