const mongodb = require('../../models/mongodb');
const moment = require('moment');

module.exports = {
    find: async function (collectionName, i_Query, limit = 0, skip = 0) {
        return new Promise((resolve, reject) => {
            mongodb[collectionName].find(i_Query)
                .skip(skip)
                .limit(limit)
                .exec(function (err, docs) {
                    if (err) {
                        return reject(new Error(err));
                    }
                    return resolve(docs);
                });
        });
    },
    /**
     * 
     * @param {*} collectionName  
     * @param {*} i_Query 
     * @param {*} iFields //return fields
     * @param {*} limit  
     * @param {*} skip 
     * 
     */
    findFilterFields: async function (collectionName, i_Query, iFields, limit = 0, skip = 0) {
        return new Promise((resolve, reject) => {
            mongodb[collectionName].find(i_Query, iFields)
                .skip(skip)
                .limit(limit)
                .exec(function (err, docs) {
                    if (err) {
                        return reject(new Error(err));
                    }
                    return resolve(docs);
                });
        });
    },
    findOneAndUpdate: async function (collectionName, query, data) {
        return new Promise((resolve) => {
            mongodb[collectionName].findOneAndUpdate(query, { $set: data }, function (err, doc) {
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    },
    aggregate_Func: async function (collectionName, i_Query) {
        return new Promise(async (resolve, reject) => {
            try {
                let agg = await mongodb[collectionName].aggregate(i_Query);
                return resolve(agg);
            } catch (e) {
                return reject(new Error(e));
            }
        });
    },
    getStudyImagesPath: async function (iParams) {
        return new Promise(async (resolve) => {
            let query = [
                {
                    $match: {
                        'identifier.value': `urn:oid:${iParams.studyID}`
                    }
                },
                {
                    $unwind: "$series"
                },
                {
                    $unwind: "$series.instance"
                },
                {
                    $group: {
                        "_id": "$_id", "instances_store_path": {
                            $push: "$series.instance.store_path"
                        }
                    }
                }
            ];
            let docs = await this.aggregate_Func('ImagingStudy', query);
            if (docs.length <= 0) {
                return resolve(false);
            } else {
                return resolve(docs[0].instances_store_path);
            }
        });
    },
    getSeriesImagesPath: async function (iParams) {
        return new Promise(async (resolve) => {
            let query = [
                {
                    $match: {
                        'identifier.value': `urn:oid:${iParams.studyID}`,
                    }
                },
                {
                    $unwind: "$series"
                },
                {
                    $unwind: "$series.instance"
                },
                {
                    $match: {
                        'series.uid': `${iParams.seriesID}`
                    }
                },
                {
                    $group: {
                        "_id": "$series_id", "instances_store_path": {
                            $push: "$series.instance.store_path"
                        }
                    }
                }
            ];
            let docs = await this.aggregate_Func('ImagingStudy', query);
            if (docs.length <= 0) {
                return resolve(false);
            } else {
                return resolve(docs[0].instances_store_path);
            }
        });
    },
    getInstanceImagePath: async function (iParams) {
        return new Promise(async (resolve) => {
            let query = [
                {
                    $match: {
                        'identifier.value': `urn:oid:${iParams.studyID}`,
                    }
                },
                {
                    $unwind: "$series"
                },
                {
                    $unwind: "$series.instance"
                },
                {
                    $match: {
                        'series.uid': `${iParams.seriesID}`,
                        'series.instance.uid': `${iParams.instanceID}`
                    }
                },
                {
                    $group: {
                        "_id": "$series_id", "instances_store_path": {
                            $push: "$series.instance.store_path"
                        }
                    }
                }
            ];
            let docs = await this.aggregate_Func('ImagingStudy', query);
            if (docs.length <= 0) {
                return resolve(false);
            } else {
                return resolve(docs[0].instances_store_path);
            }
        });
    } , 
    /**
     * @param {Object} iQuery 查詢json
     * @param {string} colName 日期欄位
     * @param {boolean} isRegex 是否已將物件轉為Regex
     */
    mongoDateQuery : async function (iQuery, colName, isRegex  ,format ='YYYYMMDD') {
        return new Promise((resolve) => {
            if (iQuery[colName]) {
                if (isRegex) {
                    iQuery[colName] = iQuery[colName].source;
                }
                let dateCondition = getDateCondition(iQuery[colName]);
                let date = getDateStr(iQuery[colName]);
                iQuery[colName] = dateCallBack[dateCondition](date , format);
            }
            return resolve(iQuery);
        });
    }  ,
    getMongoOrQs : getMongoOrQs ,
    commaValue : commaValue 
}

function getDateCondition(iDate , format ='YYYYMMDD') {
    if (iDate.indexOf('-') == 0) { //只有結束日期
        return "<=";
    } else if (iDate.indexOf('-') == iDate.length - 1) { //只有開始日期
        return ">=";
    } else if (iDate.includes('-')) {
        return "-";
    } else {
        return "=";
    }
}

function getDateStr(iDate) {
    return iDate.match(/\d+/g);
}

function gt_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $gt: moment(i_Date[0], format).toDate()
    };
    return query;
}
function lt_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $lt: moment(i_Date[0], format).toDate()
    };
    return query;
}
function gte_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $gte: moment(i_Date[0], format).toDate()
    };
    return query;
}
function lte_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $lte: moment(i_Date[0], format).toDate()
    };
    return query;
}
function between_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $gte: moment(i_Date[0], format).toDate(),
        $lte: moment(i_Date[1], format).toDate()
    };
    return query;
}
function ne_Date(i_Date , format ='YYYYMMDD') {
    let query =
    {
        $ne: moment(i_Date[0], format).toDate()
    };
    return query
}
function eq_Date(i_Date  , format ='YYYYMMDD') {
    let d = moment(i_Date[0], format);
    if (format == "HHmmss") {
        if (!i_Date[1]) {
            i_Date[1] = "000000"
        }
        let query =
        {
            $gte : moment(i_Date[0], format).toDate() ,
            $lte:  moment(i_Date[0], format).toDate()
        };
        return query;
    }
    else if (i_Date[0].length <= 4) {
        let end = moment(i_Date[0], format).endOf('year');
        return between_Date([d, end] , format);
    }
    else if (i_Date[0].length >= 5 && i_Date[0].length <= 6) {
        let end = moment(i_Date[0], format).endOf('month');
        return between_Date([d, end] , format);
    }
    else {
        let end = moment(i_Date[0], format).endOf('day');
        return between_Date([d, end] , format);
    }

}

//#region mongodb 日期
const dateCallBack = {
    '>': gt_Date, '<': lt_Date, '<=': lte_Date, '>=': gte_Date, '<>': ne_Date, '-': between_Date, '=': eq_Date
};

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
            }
            let nowKey = queryKey[i];
            let value = await commaValue(nowKey, iQuery[nowKey]);
            for (let x= 0 ; x < value.length ; x++) {
                let nowValue = value[x][nowKey];
                let wildCardFunc = {};
                wildCardFunc[nowValue.indexOf('*')] = wildCard;
                wildCardFunc['0'] = wildCardFirst;
                wildCardFunc['-1'] = (value)=>{return value;}
                value[x][nowKey] = await wildCardFunc[nowValue.indexOf('*')](nowValue);
                try {
                    await DICOMJsonKeyFunc[nowKey](value[x]);
                } catch (e) {

                }
                console.log(value[x]);
                
                if (checkIsOr(value[x] , nowKey)) {
                    mongoOrs.$or.push(...(_.get(value[x][nowKey] , "$or")));
                } else {
                    mongoOrs.$or.push(value[x]);
                }
            }
            mongoQs.$match.$and.push(mongoOrs);
        }
        return resolve(mongoQs.$match.$and.length == 0 ? {$match:{}} : mongoQs)
    });
}