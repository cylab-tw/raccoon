const mongodb = require('../../models/mongodb');
const moment = require('moment');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const {
    toRegex
} = require("../../api/Api_function");
module.exports = {
    find: async function (collectionName, iQuery, limit = 0, skip = 0) {
        return new Promise((resolve, reject) => {
            mongodb[collectionName].find(iQuery)
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
     * @param {*} iQuery 
     * @param {*} iFields //return fields
     * @param {*} limit  
     * @param {*} skip 
     * 
     */
    findFilterFields: async function (collectionName, iQuery, iFields, limit = 0, skip = 0) {
        return new Promise((resolve, reject) => {
            mongodb[collectionName].find(iQuery, iFields)
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
    aggregate_Func: async function (collectionName, iQuery) {
        return new Promise(async (resolve, reject) => {
            try {
                let agg = await mongodb[collectionName].aggregate(iQuery);
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
    commaValue : commaValue 
};

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

function gtDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $gt: moment(iDate[0], format).toDate()
    };
    return query;
}
function ltDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $lt: moment(iDate[0], format).toDate()
    };
    return query;
}
function gteDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $gte: moment(iDate[0], format).toDate()
    };
    return query;
}
function lteDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $lte: moment(iDate[0], format).toDate()
    };
    return query;
}
function betweenDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $gte: moment(iDate[0], format).toDate(),
        $lte: moment(iDate[1], format).toDate()
    };
    return query;
}
function neDate(iDate , format ='YYYYMMDD') {
    let query =
    {
        $ne: moment(iDate[0], format).toDate()
    };
    return query;
}
function eqDate(iDate  , format ='YYYYMMDD') {
    let d = moment(iDate[0], format);
    if (format == "HHmmss") {
        if (!iDate[1]) {
            iDate[1] = "000000";
        }
        let query =
        {
            $gte : moment(iDate[0], format).toDate() ,
            $lte:  moment(iDate[0], format).toDate()
        };
        return query;
    }
    else if (iDate[0].length <= 4) {
        let end = moment(iDate[0], format).endOf('year');
        return betweenDate([d, end] , format);
    }
    else if (iDate[0].length >= 5 && iDate[0].length <= 6) {
        let end = moment(iDate[0], format).endOf('month');
        return betweenDate([d, end] , format);
    }
    else {
        let end = moment(iDate[0], format).endOf('day');
        return betweenDate([d, end] , format);
    }

}

//#region mongodb 日期
const dateCallBack = {
    '>': gtDate, '<': ltDate, '<=': lteDate, '>=': gteDate, '<>': neDate, '-': betweenDate, '=': eqDate
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