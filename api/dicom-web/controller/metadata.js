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
            replaceBinaryData(item[0].metadata);
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


function propertiesToArray(obj) {
    const addDelimiter = (a, b) =>
        a ? `${a}.${b}` : b;

    const paths = (obj = {}, head = '') => {
        return Object.entries(obj)
            .reduce((product, [key, value]) => 
                {
                    let fullPath = addDelimiter(head, key)
                    return _.isObject(value) ?
                        product.concat(paths(value, fullPath))
                    : product.concat(fullPath)
                }, []);
    }
    return paths(obj);
}

function replaceBinaryData (data) {
    let keys = propertiesToArray(data);
    let binaryKeys = [];
    let isBinary = false;
    for (let key of keys) {
        let keyData = _.get(data , key);
        let isbinaryValueKey = ( key.includes("Value") || key.includes("InlineBinary") ) && !key.includes('vr');
        if (isBinary && isbinaryValueKey) {
            binaryKeys.push(key);
        } else {
            isBinary = false;
        }
        if (keyData== "OW" || keyData == "OB") {
            isBinary = true;
        }
    }
    let port = process.env.DICOMWEB_PORT || "";
    port = (port) ? `:${port}` : "";
    for (let key of binaryKeys) {
        let instanceUID = _.get(data , `${key.substring(0,1)}.00080018.Value.0`);
        let valuePos = key.lastIndexOf("InlineBinary") ||key.lastIndexOf("Value");
        let keyBulkDataURI = `${key.substring(0 , valuePos)}BulkDataURI`;
        let keyLastStr = key.substring(key.length -1 , key.length );
        if (_.isNumber(keyLastStr)) {
            let valueKey = key.substring(0 , key.length-2)
            _.omit(data , valueKey);
        } else {
            _.omit(data , key);
        }
        
        _.set(data , keyBulkDataURI ,`http://${process.env.DICOMWEB_HOST}${port}/api/dicom/instance/${instanceUID}/bulkData/${key.substr(2)}`);
    }
}