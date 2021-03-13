const { isNumber } = require('lodash');
const _ = require('lodash');
const moment = require('moment');
const prefix = ["eq" , "ne" , "lt" , "gt" , "ge" , "le" , "sa" , "eb" , "ap"];
function stringQuery(str, key) {
    let keySplit = key.split(':');
    const buildContainsOrExact = {
        "contains": stringContains,
        "exact": stringExact
    }
    let buildFunc = {
        '1': () => {
            return stringContainStart(str);
        },
        '2': () => {
            let modifier = keySplit[1];
            return buildContainsOrExact[modifier](str);
        }
    }
    return buildFunc[keySplit.length]();
}

function stringContainStart(str) {
    str = str.replace(/[\\(\\)\\-\\_\\+\\=\\\/\\.]/g, '\\$&');
    str = str.replace(/[\*]/g, '\\.$&');
    str = `^${str}`;
    return { $regex: new RegExp(str, 'gi') };
}
function stringContains(str) {
    str = str.replace(/[\\(\\)\\-\\_\\+\\=\\\/\\.]/g, '\\$&');
    str = str.replace(/[\*]/g, '\\.$&');
    return { $regex: new RegExp(str, 'gi') };
}
function stringExact(str) {
    str = str.replace(/[\\(\\)\\-\\_\\+\\=\\\/\\.]/g, '\\$&');
    str = str.replace(/[\*]/g, '\\.$&');
    return str;
}


function tokenQuery(item, type, field, required) {
    let queryBuilder = {};
    let system = "";
    let value = "";
    [system, value] = item.split('|');
    if (required) {
        system = required;
    }
    value = value || item;
    if (system) {
        queryBuilder[`${field}.system`] = system;
    }
    if (value) {
        if (type) {
            queryBuilder[`${field}.${type}`] = value;
        } else {
            queryBuilder[`${field}`] = value;
        }
    }
    if (system == value) {
        let ors = {
            $or : []
        };
        for(let i in queryBuilder) {
            ors.$or.push({
                [i] : queryBuilder[i]
            })
        }
        return ors;
    }
    return queryBuilder;
};

function quantityQuery(item, field) {
    let queryBuilder = {};
    let system = "";
    let code = "";
    let value = "";
    [value , system, code] = item.split('|');
    if (system) {
        queryBuilder[`${field}.system`] = system;
    }
    if (code) {
        queryBuilder[`${field}.code`] = code;
    }
    let tempNumberQuery = numberQuery(value , field);
    if (!tempNumberQuery) {
        return false;
    }
    queryBuilder[`${field}.value`] = tempNumberQuery[field];
    if (system || code) {
        let ors = {
            $or : []
        };
        for(let i in queryBuilder) {
            ors.$or.push({
                [i] : queryBuilder[i]
            })
        }
        return ors;
    }
    return queryBuilder;
};


function addressQuery(target , key) {
    // Tokenize the input as mush as possible
    let totalSplit = target.split(/[\s,]+/);
    let ors = {$or: []};
    for (let index in totalSplit) {
        let queryValue = stringQuery(totalSplit[index], key);
        ors.$or.push(
            { 'address.line': queryValue },
            { 'address.city': queryValue },
            { 'address.district': queryValue },
            { 'address.state': queryValue },
            { 'address.postalCode': queryValue },
            { 'address.country': queryValue }
        );
    }
    return ors;
};

function nameQuery(target , key) {
    let totalSplit = target.split(/[\s.,]+/);
    let ors = {$or:[]};

    for (let index in totalSplit) {
        let queryValue = stringQuery(totalSplit[index], key);
        ors.$or.push(
                { 'name.text': queryValue },
                { 'name.family': queryValue },
                { 'name.given': queryValue },
                { 'name.suffix': queryValue },
                { 'name.prefix': queryValue }
        );
    }
    return ors;
};
let dateQueryBuilder = {
    "eq" : (queryBuilder,  field , date , format) => {
        let gte = moment(date).startOf(format);
        let lte = moment(date).endOf(format);
        let result = {
            "$gte" : gte.toDate() ,
            "$lte" : lte.toDate()
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "ne" : (queryBuilder,  field , date , format) => {
        let gd = moment(date).set(format ,moment(date).get(format)+1);
        let ld = moment(date).set(format ,moment(date).get(format)-1);
        let  result = {
            $or : [
                {
                    [field] : {
                        "$gte" : moment(gd).toDate() ,
                    }
                } ,
                {
                    [field] : {
                        "$lte" : moment(ld).toDate()
                    }
                }
            ]
        }
        queryBuilder = result;
        return queryBuilder;
    } , 
    "lt" : (queryBuilder,  field , date , format) => {
        let result = {
            "$lt" : moment(date).toDate() 
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "gt" : (queryBuilder,  field , date , format) => {
        let result = {
            "$gt" : moment(date).toDate() 
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "ge" : (queryBuilder,  field , date , format) => {
        let result = {
            "$gte" : moment(date).toDate() 
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "le" : (queryBuilder,  field , date , format) => {
        let result = {
            "$lte" : moment(date).toDate() 
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } 
}
function dateQuery (value, field) {
    let queryBuilder = {};
    let date = value.substring(2);
    let queryPrefix = value.substring(0,2);
    if (prefix.indexOf(queryPrefix) < 0) {
        queryPrefix = "eq";
        date = value;
    }
    let isVaildDate = moment(new Date(date)).isValid();
    if (!isVaildDate) {
        return false;
    }
    
    let momentYYYYDate = moment(date , 'YYYY', true);
    let momentYYYYMMDate = moment(date , 'YYYY-MM' , true);
    let momentYYYYMMDDDate = moment(date , 'YYYY-MM-DD', true);
    let momentVaildArr = [momentYYYYDate.isValid() ,  momentYYYYMMDate.isValid() ,momentYYYYMMDDDate.isValid()];
    let momentValidIndex = momentVaildArr.indexOf(true);
    if (momentValidIndex < 0 ) {
        return false;
    }
    if (moment(date , moment.ISO_8601 , true).isValid()) {
        date = moment(date).format();
    } else if (moment(date , 'YYYY', true).isValid()) {
        date = moment(new Date(date) , moment.ISO_8601).format();
    }
    let inputFormat =  ["year" , "month" , "date"];
    queryBuilder = dateQueryBuilder[queryPrefix](queryBuilder , field , date , inputFormat[momentValidIndex]);
    return queryBuilder;
}
function dateTimeQuery (value , field) {
    let queryBuilder = {};
    let dateTimeRegex = /([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?)/gm;
    if (!dateTimeRegex.test(value)) {
        return false;
    }
   
    let date = value.substring(2);
    let queryPrefix = value.substring(0,2);
    if (prefix.indexOf(queryPrefix) < 0) {
        queryPrefix = "eq";
        date = value;
    }
    let isVaildDate = moment(new Date(date)).isValid();
    if (!isVaildDate) {
        return false;
    }
    
    let momentYYYYDate = moment(date , 'YYYY', true);
    let momentYYYYMMDate = moment(date , 'YYYY-MM' , true);
    let momentYYYYMMDDDate = moment(date , 'YYYY-MM-DD', true);
    let momentVaildArr = [momentYYYYDate.isValid() ,  momentYYYYMMDate.isValid() ,momentYYYYMMDDDate.isValid()];
    let momentValidIndex = momentVaildArr.indexOf(true);
    if (momentValidIndex < 0 ) {
        momentValidIndex = 2;
    }
    if (moment(date , moment.ISO_8601 , true).isValid()) {
        date = moment(date).format();
    } else if (moment(date , 'YYYY', true).isValid()) {
        date = moment(new Date(date) , moment.ISO_8601).format();
    }
    let inputFormat =  ["year" , "month" , "date"];
    queryBuilder = dateQueryBuilder[queryPrefix](queryBuilder , field , date , inputFormat[momentValidIndex]);
    return queryBuilder;
}
function timeQuery () {

}

function referenceQuery (query , field) {
    const urlRegex = /^(http|https):\/\/(.*)\/(\w+\/.+)$/;
    const isUrl = query.match(urlRegex);
    let typeAndId = query.split("/");
    let queryBuilder = {};
    if (isUrl) {
        _.set(queryBuilder , field , isUrl[3]);
        queryBuilder[field] = isUrl[3];
        return result;
    } else if (typeAndId.length == 2) {
        queryBuilder[field] = `${typeAndId[0]}/${typeAndId[1]}`
    } else {
        queryBuilder[field] = {$regex : new RegExp(query)}
    }
    return queryBuilder;
}
function arrayStringBuild (query , field , queryField ,deleteFields=['']) {
    if (!_.isArray(query[field])) {
        query[field] = [query[field]];
    }
    for (let item of query[field]) {
        stringBuild(query , item , field , queryField , deleteFields);
    }
}
function stringBuild (query , item , field , queryField ,deleteFields=['']) {
    let buildResult = stringQuery(item , field);
    query.$and.push({
        [queryField]: buildResult
    });
    for (let i of deleteFields) {
        delete query[i];
    }
}

let numberQueryBuilder = {
    "eq" : (queryBuilder,  field , num) => {
        let result = {
            "$eq" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "ne" : (queryBuilder,  field , num) => {
        let result = {
            "$ne" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "ne" : (queryBuilder,  field , num) => {
        let result = {
            "$eq" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "gt" : (queryBuilder,  field , num) => {
        let result = {
            "$gt" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "lt" : (queryBuilder,  field , num) => {
        let result = {
            "$lt" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "ge" : (queryBuilder,  field , num) => {
        let result = {
            "$gte" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "le" : (queryBuilder,  field , num) => {
        let result = {
            "$lte" : Number(num)
        }
        queryBuilder[field] = result;
        return queryBuilder;
    } ,
    "sa" : (queryBuilder,  field , num) => {
        return new Error("not support prefix");
    } ,
    "eb" : (queryBuilder,  field , num) => {
        return new Error("not support prefix");
    } ,
    "ap" : (queryBuilder,  field , num) => {
        return new Error("not support prefix");
    } ,
    
}
function numberQuery (value, field) {
    try {
        let queryBuilder = {};
        let num = value.substring(2);
        let queryPrefix = value.substring(0,2);
        if (isNumber(prefix)) {
            queryPrefix = "eq";
            num = value;
        }
        queryBuilder = numberQueryBuilder[queryPrefix](queryBuilder , field , num );
        return queryBuilder;
    } catch(e) {
        return false;
    }   
}

module.exports = exports = {
    stringQuery: stringQuery,
    numberQuery : numberQuery ,
    tokenQuery: tokenQuery,
    addressQuery: addressQuery ,
    nameQuery : nameQuery ,
    dateQuery : dateQuery , 
    dateTimeQuery : dateTimeQuery ,
    quantityQuery : quantityQuery , 
    referenceQuery : referenceQuery , 
    arrayStringBuild : arrayStringBuild
}
