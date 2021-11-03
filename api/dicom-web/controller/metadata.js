const mongodb = require('models/mongodb');
const _ = require('lodash');
const mongoFunc = require('../../../models/mongodb/func');
const fs = require('fs');
const path = require('path');
const { sendNotFoundMessage, sendServerWrongMessage } = require('../../../models/DICOMWeb/httpMessage');
const flat = require('flat');

const returnProject = {
    $project: {
        _id: 0,
        __v: 0,
        studyUID: 0,
        seriesUID: 0,
        instanceUID: 0
    }
};

module.exports = async function (req, res) {
    try {
        let getMetaFunc = [getStudyInstanceStorePath, getSeriesInstanceStorePath, getInstanceStorePath];
        let errorMessage = {
            message: "cannot found"
        }
        let keys = Object.keys(req.params);
        let item = await getMetaFunc[keys.length - 1](req.params);
        for (let i of keys) {
            errorMessage.message = `${errorMessage.message} ${keys}:${req.params[i]}`
        }
        if (item.length <= 0) return res.status(404).json(errorMessage);
        if (item) {
            let resMetadata = [];
            for (let instance of item) {
                let fullPath = path.join(process.env.DICOM_STORE_ROOTPATH, instance.path);
                let metadataStorePath = path.join(path.dirname(fullPath), `${instance.instanceUID}.metadata.json`);
                if (!fs.existsSync(metadataStorePath)) {
                    return sendNotFoundMessage(req, res);
                }
                let metadataJsonStr = fs.readFileSync(metadataStorePath, { encoding: 'utf8' });
                let metadataJson = JSON.parse(metadataJsonStr);
                let replacedMetadata = replaceBinaryData(metadataJson);
                if (replacedMetadata) {
                    resMetadata.push(replacedMetadata);
                } else {
                    resMetadata.push(metadataJson);
                }
            }
            res.setHeader('Content-Type', 'application/dicom+json');
            return res.send(resMetadata);
        }
        res.setHeader('Content-Type', 'application/dicom+json');
        return res.status(404).json(errorMessage);
    } catch (e) {
        console.error(e);
        return sendServerWrongMessage(res, e);
    }
}
function replaceBinaryData(data) {
    try {
        let binaryKeys = [];
        let flatDicomJson = flat(data);
        for (let key in flatDicomJson) {
            //if (key.includes("7FE00010")) continue;
            if (flatDicomJson[key] == "OW" || flatDicomJson[key] == "OB") {
                binaryKeys.push(key.substring(0, key.lastIndexOf(".vr")));
            }
        }
        let port = process.env.DICOMWEB_PORT || "";
        port = (port) ? `:${port}` : "";
        for (let key of binaryKeys) {
            if (_.get(data, `${key}.BulkDataURI`) ) {
                let oldBulkDataURI = _.get(data, `${key}.BulkDataURI`);
                let oldBulkDataURISplit = oldBulkDataURI.split("/");
                let newHost = `${process.env.DICOMWEB_HOST}${port}`;
                oldBulkDataURISplit[2] = newHost;
                _.set(data, `${key}.BulkDataURI`, oldBulkDataURISplit.join("/"));
            }
        }
        return data;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function getStudyMetadata(params) {
    const metadataQuery = [
        {
            $match: {
                $and: [
                    {
                        studyUID: params.studyID
                    }
                ]

            }
        },
        returnProject
        ,
        {
            $group: {
                "_id": "$seriesUID",
                "metadata": {
                    $push: "$$ROOT"
                }
            }
        }
    ]
    let agg = await mongoFunc.aggregate_Func("dicomMetadata", metadataQuery)
    return agg;
}
async function getSeriesMetadata(params) {
    const metadataQuery = [
        {
            $match: {
                $and: [
                    {
                        studyUID: params.studyID
                    },
                    {
                        seriesUID: params.seriesID
                    }
                ]

            }
        },
        returnProject
        ,
        {
            $group: {
                "_id": "$seriesUID",
                "metadata": {
                    $push: "$$ROOT"
                }
            }
        }
    ]
    let agg = await mongoFunc.aggregate_Func("dicomMetadata", metadataQuery)
    return agg;
}
async function getInstanceMetadata(params) {
    const metadataQuery = [
        {
            $match: {
                $and: [
                    {
                        studyUID: params.studyID
                    },
                    {
                        seriesUID: params.seriesID
                    },
                    {
                        instanceUID: params.instanceID
                    }
                ]

            }
        },
        returnProject
        ,
        {
            $group: {
                "_id": "$instanceUID",
                "metadata": {
                    $push: "$$ROOT"
                }
            }
        }
    ]
    let agg = await mongoFunc.aggregate_Func("dicomMetadata", metadataQuery)
    return agg;
}



async function getStudyInstanceStorePath(params) {
    let aggregate_Query =
        [
            {
                $match: {
                    'dicomJson.0020000D.Value': params.studyID,
                }
            },
            {
                $unwind: '$series'
            },
            {
                $unwind: '$series.instance'
            },
            {
                $group:
                {
                    _id: null,
                    instanceStorePathList:
                    {
                        $push:
                        {
                            path: "$series.instance.store_path",
                            instanceUID: "$series.instance.uid"
                        }
                    }
                }
            }
        ]
    let instances = await find_Aggregate_Func('ImagingStudy', aggregate_Query);
    if (instances[0].instanceStorePathList.length <= 0) return false;
    try {
        return (instances[0].instanceStorePathList);
    } catch (e) {
        console.log("getInstancePath error\r\n" + JSON.stringify(aggregate_Query, null, 4));
        //console.log(aggregate_Query);
        return false;
    }

}

async function getSeriesInstanceStorePath(params) {
    let aggregate_Query =
        [
            {
                $match: {
                    'dicomJson.0020000D.Value': params.studyID,
                }
            },
            {
                $unwind: '$series'
            },
            {
                $match:
                {
                    'series.dicomJson.0020000E.Value': params.seriesID,
                }
            },
            {
                $unwind: '$series.instance'
            },
            {
                $group:
                {
                    _id: null,
                    instanceStorePathList:
                    {
                        $push:
                        {
                            path: "$series.instance.store_path",
                            instanceUID: "$series.instance.uid"
                        }
                    }
                }
            }
        ]
    let instances = await find_Aggregate_Func('ImagingStudy', aggregate_Query);
    if (instances[0].instanceStorePathList.length <= 0) return false;
    try {
        return (instances[0].instanceStorePathList);
    } catch (e) {
        console.log("getInstancePath error\r\n" + JSON.stringify(aggregate_Query, null, 4));
        //console.log(aggregate_Query);
        return false;
    }
}

async function getInstanceStorePath(params) {
    let aggregate_Query =
        [
            {
                $match: {
                    'dicomJson.0020000D.Value': params.studyID,
                }
            },
            {
                $unwind: '$series'
            },
            {
                $match:
                {
                    'series.dicomJson.0020000E.Value': params.seriesID,
                }
            },
            {
                $unwind: '$series.instance'
            },
            {
                $match:
                {
                    'series.instance.dicomJson.00080018.Value': params.instanceID
                }
            },
            {
                $group:
                {
                    _id: null,
                    instanceStorePathList:
                    {
                        $push:
                        {
                            path: "$series.instance.store_path",
                            instanceUID: "$series.instance.uid"
                        }
                    }
                }
            }
        ]
    let instances = await find_Aggregate_Func('ImagingStudy', aggregate_Query);
    if (instances[0].instanceStorePathList.length <= 0) return false;
    try {
        return (instances[0].instanceStorePathList);
    } catch (e) {
        console.log("getInstancePath error\r\n" + JSON.stringify(aggregate_Query, null, 4));
        //console.log(aggregate_Query);
        return false;
    }
}

async function find_Aggregate_Func(collection_Name, i_Query) {
    return new Promise(async (resolve, reject) => {
        let agg = await mongodb[collection_Name].aggregate(
            i_Query);
        return resolve(agg);
    });
}