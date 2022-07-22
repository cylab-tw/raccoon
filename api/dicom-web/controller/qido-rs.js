const { dicomjson } = require('../../../models/FHIR/dicom-tag');
const { qidoRetAtt } = require('../../../models/FHIR/dicom-tag');
const mongoFunc = require('../../../models/mongodb/func');
const { toRegex } = require('../../Api_function');
const {mongoDateQuery} = require('../../../models/mongodb/func');
const { refreshParam } = require('../../Api_function');
const { textSpaceToOrCond } = require('../../Api_function');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const moment = require('moment');
const { setRetrieveURL } = require('../../../models/DICOMWeb');
const mongodb = require('../../../models/mongodb');
const { logger } = require('../../../utils/log');
/**
 * 
 * @api {get} /dicom-web/studies QIDO-RS
 * @apiName QIDO-RS-ROOT
 * @apiGroup QIDO-RS
 * 
 * @apiSuccess (Success 200) {json} name: QIDO-RS-DICOM-JSON Content-Type: application/dicom-json response-body DICOM JSON model
 * 
 * @apiQuery {String} dicom-tag-name The dicom tag name e.g. 00100010=hello
 * 
 * @apiExample {curl} curl
 *    curl http://localhost:8080/dicom-web/studies?00100010=hello
 */
module.exports = async function (req , res) {
    logger.info(`[QIDO-RS] [Path: /studies, Retrieve all of studies in the database] [Request query: ${JSON.stringify(req.query)}]`);
    let limit = req.query.limit || 100 ;
    let skip = req.query.offset || 0;
    delete req.query["limit"];
    delete req.query["offset"];
    let qs = _.cloneDeep(req.query);
    let qsKeys = Object.keys(qs).sort();
    for (let i = 0 ; i < qsKeys.length ; i++) {
        if (!qs[qsKeys[i]] || qs['FHIR']) {
            delete qs[qsKeys[i]];
        }
    }
    //將搜尋欄位改成全是dicomTag代碼
    let newQS = await qsDICOMTag(qs);
    newQS = await refreshParam(newQS);
    let keys = Object.keys(req.params);
    let paramsStr = "";
    for (let i = 0 ; i < keys.length ; i++) {
        paramsStr += keys[i]; 
    }
    if (!paramsStr) {
        paramsStr = "studyID";
    }
    let qidoFunc = [getStudyDicomJson , getSeriesDicomJson , getInstanceDicomJson];
    let qidoResult =  await qidoFunc[keys.length](newQS , req.params , parseInt(limit)  , parseInt(skip));
    if (!qidoResult.status) {
        return res.status(500).send(qidoResult.data);
    }
    for (let i in qidoResult.data) {
        let studyDate = _.get(qidoResult.data[i] , "00080020.Value");
        if (studyDate) {
            for (let j in studyDate) {
                let studyDateYYYYMMDD = moment(studyDate[j] ).format( "YYYYMMDD").toString();
                studyDate[j] = studyDateYYYYMMDD;
            }
            _.set(qidoResult.data[i] , "00080020.Value" , studyDate);
        }
        qidoResult.data[i] = await sortField(qidoResult.data[i]);
    }
    if (qidoResult.data.length == 0 ) {
        return res.status(204).send([]);
    }
    res.setHeader('Content-Type' , 'application/dicom+json');
    setRetrieveURL(qidoResult.data , keys.length);
    return res.status(200).json(qidoResult.data);
};

//#region 獲取各階層的DICOMJSON
async function getStudyDicomJson(iQuery , iParam = "" , limit , skip) {
    logger.info(`[QIDO-RS] [Query Study Level]`);
    let result = {
        data : '' ,
        status: false
    };
    try {
        let retStudyLevel = {};

        retStudyLevel = await getLevelDicomJson("", ['study'], false);

        iQuery = await getMongoOrQs(iQuery);
        iQuery = iQuery.$match;
        logger.info(`[QIDO-RS] [Query for MongoDB: ${JSON.stringify(iQuery)}]`);
        let docs = await mongoFunc.findFilterFields('ImagingStudy', iQuery, retStudyLevel, limit, skip);
        let retDocs = [];
        for (let i = 0; i < docs.length; i++) {
            retDocs.push(docs[i]._doc.dicomJson);
        }
        result.data = retDocs;
        result.status = true;
        return result;
    } catch (e) {
        console.error("get Study DICOM error" , e);
        result.data = e;
        result.status = false;
        return result;
    }
}
async function getSeriesDicomJson(iQuery , iParam , limit , skip) {
    logger.info(`[QIDO-RS] [Query Series Level, study uid: ${iParam.studyID}]`);
    let result = {
        data: '',
        status: false
    };
    try {
        let qs = {
            "identifier.value": `urn:oid:${iParam.studyID}`
        };
        iQuery = Object.assign(iQuery, qs);
        let unwindField = [{
            $unwind: '$series'
        }];
        let level = ['study', 'series'];
        let mongoAgg = await getMongoAgg(iQuery, unwindField, level, limit, skip);
        logger.info(`[QIDO-RS] [Query for MongoDB: ${JSON.stringify(mongoAgg)}]`);
        let docs = await mongoFunc.aggregate_Func('ImagingStudy', mongoAgg);
        result.data = docs;
        result.status = true;
        return result;
    } catch (e) {
        console.error("get Series DICOM Json error:" , e);
        result.data = e;
        result.status = false;
        return result;
    }

}
async function getInstanceDicomJson(iQuery , iParam , limit , skip) {
    logger.info(`[QIDO-RS] [Query Instance Level, study uid: ${iParam.studyID},series uid: ${iParam.seriesID}]`);
    let result = {
        data: '',
        status: false
    };
    try {
        let qs = {
            "identifier.value": `urn:oid:${iParam.studyID}`,
            "series.uid": iParam.seriesID
        };
        iQuery = Object.assign(iQuery, qs);
        let unwindField = [{
            $unwind: '$series'
        }, {
            $unwind: '$series.instance'
        }];
        let level = ['study', 'series', 'instance'];
        let mongoAgg = await getMongoAgg(iQuery, unwindField, level, limit, skip);
        logger.info(`[QIDO-RS] [Query for MongoDB: ${JSON.stringify(mongoAgg)}]`);
        let docs = await mongoFunc.aggregate_Func('ImagingStudy', mongoAgg);
        result.data = docs;
        result.status = true;
        return result;
    } catch(e) {
        console.error("get instance dicom json error:" , e);
        result.data = e;
        result.status = false;
        return result;
    }
}
//#endregion



//#region  將各查詢欄位組成or查詢
async function commaValue (ikey , iValue) {
    return new Promise((resolve) => {
        let $or = [];
        iValue = iValue.split(',');
        for (let i = 0  ; i < iValue.length ; i++) {
            let obj = {} ;
            obj[ikey] = iValue[i];
            $or.push(obj);
        }
        return resolve($or);
    });
}

async function wildCardFirst (iValue) {
    return new Promise ((resolve) => {
        iValue = iValue.replace(/\*/gi , '.*');
        return resolve(new RegExp(iValue , 'gi'));
    });
}
async function wildCard (iValue) {
    return new Promise ((resolve) => {
        iValue = '^' + iValue;
        iValue = iValue.replace(/\*/gi , '.*');
        return resolve(new RegExp(iValue , 'gi'));
    });
}

const dicomJsonKeyFunc = {
    "dicomJson.00080020.Value" : async (value) => {
        let nowKey= "dicomJson.00080020.Value";
        await mongoDateQuery(value , nowKey , false);
        for (let i  in value[nowKey]) {
            value[nowKey][i] =new Date(value[nowKey][i]).toISOString();
        }
    }, 
    "dicomJson.00080030.Value" : async (value) => {
        let nowKey = "dicomJson.00080030.Value";
        await mongoDateQuery(value , nowKey , false , "HHmmss");
        for (let i  in value[nowKey]) {
            value[nowKey][i] =moment(value[nowKey][i]).format("HHmmss");
            if (i == "$lte") {
                value[nowKey][i] += ".000000";
            }
        }
    } , 
    "dicomJson.00100010.Value" : async (value) => {
        let nowKey = "dicomJson.00100010.Value";
        let queryValue  = await toRegex(value);
        let query = {
            $or : [
            {
                "dicomJson.00100010.Value.Alphabetic" : queryValue[nowKey]
            }, 
            {
                "dicomJson.00100010.Value.familyName" : queryValue[nowKey]
            },
            {
                "dicomJson.00100010.Value.givenName" : queryValue[nowKey] 
            } ,
            {
                "dicomJson.00100010.Value.middleName" :queryValue[nowKey] 
            } ,
            {
                "dicomJson.00100010.Value.prefix" : queryValue[nowKey] 
            },
            {
                "dicomJson.00100010.Value.suffix" : queryValue[nowKey]
            }
        ]};
        value[nowKey] = query;
    } ,
    "series.dicomJson.00100010.Value" : async (value) => {
        let nowKey = "series.dicomJson.00100010.Value";
        let queryValue  = await toRegex(value);
        let query = {
            $or : [
            {
                "dicomJson.00100010.Value.Alphabetic" : queryValue[nowKey]
            }, 
            {
                "dicomJson.00100010.Value.familyName" : queryValue[nowKey]
            },
            {
                "dicomJson.00100010.Value.givenName" : queryValue[nowKey] 
            } ,
            {
                "dicomJson.00100010.Value.middleName" :queryValue[nowKey] 
            } ,
            {
                "dicomJson.00100010.Value.prefix" : queryValue[nowKey] 
            },
            {
                "dicomJson.00100010.Value.suffix" : queryValue[nowKey]
            }
        ]};
        value[nowKey] = query;
    } ,
    "timeFormat" : () => {

    },
    "series.dicomJson.00080020.Value" : async (value) => {
        let nowKey = "series.dicomJson.00080020.Value";
        await mongoDateQuery(value, nowKey, false);
        for (let i in value[nowKey]) {
            value[nowKey][i] = new Date(value[nowKey][i]).toISOString();
        }
    }
};
function checkIsOr (value , keyName)  {
    if (_.isObject(value) && _.get(value[keyName] , "$or")) {
        return true;
    }
    return false;
}
async function getMongoOrQs (iQuery) {
    return new Promise(async (resolve)=> {
        let queryKey=  Object.keys(iQuery);
        let mongoQs = {
            "$match" : {
                "$and" : []
            }
        };
        for (let i = 0 ; i < queryKey.length ; i++) {
            let mongoOrs = {
                "$or" :[]
            };
            let nowKey = queryKey[i];
            let value = await commaValue(nowKey, iQuery[nowKey]);
            for (let x= 0 ; x < value.length ; x++) {
                let nowValue = value[x][nowKey];
                let wildCardFunc = {};
                wildCardFunc[nowValue.indexOf('*')] = wildCard;
                wildCardFunc['0'] = wildCardFirst;
                wildCardFunc['-1'] = (value)=>{return value;};
                value[x][nowKey] = await wildCardFunc[nowValue.indexOf('*')](nowValue);
                try {
                    await dicomJsonKeyFunc[nowKey](value[x]);
                } catch (e) { // eslint-disable-lint no-empty

                }
                
                if (checkIsOr(value[x] , nowKey)) {
                    mongoOrs.$or.push(...(_.get(value[x][nowKey] , "$or")));
                } else {
                    mongoOrs.$or.push(value[x]);
                }
            }
            mongoQs.$match.$and.push(mongoOrs);
        }
        return resolve(mongoQs.$match.$and.length == 0 ? {$match:{}} : mongoQs);
    });
}
//#endregion

//#region 獲取mongo aggregate的json
async function getMongoAgg (iQuery , aggUnwind , dicomLevel , limit , skip) {
    limit  = parseInt(limit);
    skip = parseInt(skip);
    return new Promise (async (resolve) => {
        let mongoQs = await getMongoOrQs(iQuery);
        let mongoAgg = aggUnwind;
        let retProject = {
            "$project" : await getLevelDicomJson(iQuery , dicomLevel)
        };
        let skipAgg = {
            $skip : skip
        };
        let limitAgg = {
            $limit : limit+skip
        };
        mongoAgg.push(mongoQs);
        mongoAgg.push(limitAgg);
        mongoAgg.push(skipAgg);
        mongoAgg.push(retProject);
        return resolve(mongoAgg);
    });
}
//#endregion



//#region 獲取各階層的DICOM JSON的tag
async function getLevelDicomJson (iQuery , retLevel , isAgg = true) {
    return new Promise (async (resolve) => {
        
        const levelMongoKey = {
            "study" : "dicomJson"  , 
            "series" : "series.dicomJson" , 
            "instance" : "series.instance.dicomJson"
        };
        let retLevelObj  = {};
        let retLevelTag = {};
        for (let i = 0 ; i < retLevel.length ; i++) {
            let nowLevel = retLevel[i];
            let levelKey = Object.keys(qidoRetAtt[nowLevel]);
            for (let x  = 0 ; x < levelKey.length ; x++) {
                retLevelObj[`${levelMongoKey[nowLevel]}.${levelKey[x]}`] = 1;
                retLevelTag[`${levelKey[x]}`] = `$${levelMongoKey[nowLevel]}.${levelKey[x]}`;
            }
        }
        retLevelTag['_id'] = 0;
        retLevelObj['_id'] = 0;
        //console.log(retLevelTag);
        return resolve(isAgg ? retLevelTag : retLevelObj);
    });
}

//#endregion


//#region 將搜尋條件全轉為DICOM TAG的數字
async function qsDICOMTag(iParam) {
    return new Promise ((resolve)=> {
        let keys = Object.keys(iParam);
        let newQS = {};
        for (let i=  0 ; i < keys.length ; i++) {
            let keyName = keys[i];
            let keyNameSplit = keyName.split('.');
            let newKeyNames = ["dicomJson"];
            for (let x= 0 ; x < keyNameSplit.length ;  x++) {
                if (dicomjson.dicom[keyNameSplit[x]]) {
                    newKeyNames.push(dicomjson.dicom[keyNameSplit[x]]);
                } else if (dicomjson.tag[keyNameSplit[x]]) {
                    newKeyNames.push(keyNameSplit);
                } else {
                    //newKeyNames.push(keyNameSplit);
                }
            }
            if (newKeyNames.length == 1) {
                continue;
            }
            let studyTags = Object.keys(qidoRetAtt.study);
            let seriesTags = Object.keys(qidoRetAtt.series);
            let instanceTags = Object.keys(qidoRetAtt.instance);
            for (let seriesTag of seriesTags) {
                if (newKeyNames.find(v => v == seriesTag) && !studyTags.includes(seriesTag)) {
                    newKeyNames = [ "series", ...newKeyNames];
                }
            }
            for (let instanceTag of instanceTags) {
                if (newKeyNames.find(v => v == instanceTag) && !studyTags.includes(instanceTag) && !seriesTags.includes(instanceTag)) {
                    newKeyNames = [ "series", "instance", ...newKeyNames];
                }
            }
            newKeyNames.push('Value');
            let retKeyName = newKeyNames.join('.');
            newQS[retKeyName] = iParam[keyName];
        }
        return resolve(newQS);
    });
}
//#endregion

async function sortObject (obj , keys , method) {
    return new Promise ((resolve)=> {
        obj = _.orderBy(obj , keys , method);
        return resolve(obj);
    });
}

async function sortField (obj) {
    return new Promise ((resolve)=> {
        let objkeys = Object.keys(obj).sort();
        let retObj = {};
        for (const key of objkeys) {
            retObj[key] = obj[key];
        }
        return resolve(retObj);
    });
}

module.exports.qidorsFunc = {
    getMongoOrQs : getMongoOrQs , 
    getMongoAgg : getMongoAgg  ,
    qsDICOMTag : qsDICOMTag ,
    sortField : sortField
};
