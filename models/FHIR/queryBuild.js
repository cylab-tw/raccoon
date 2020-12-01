const { strToRegex, ToRegex } = require('../../api/Api_function');
const _ = require('lodash');
const moment = require('moment');

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
    let system = undefined;
    let value = undefined;
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
        let result = {
            "$gte" : moment(date).toDate() ,
            "$lte" : moment(date).toDate()
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
        console.log(JSON.stringify(queryBuilder));
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
    if (field=="birthdate") field="birthDate";
    let prefix = ["eq" , "ne" , "lt" , "gt" , "ge" , "le" , "sa" , "eb" , "ap"];
    let date = value.substring(2);
    let queryPrefix = value.substring(0,2);
    if (prefix.indexOf(queryPrefix) < 0) {
        queryPrefix = "eq";
        date = value;
    }
    console.log(new Date(date))
    let isVaildDate = moment(new Date(date)).isValid();
    if (!isVaildDate) {
        return false;
    }
    
    let momentYYYYDate = moment(date , 'YYYY', true);
    let momentYYYYMMDate = moment(date , 'YYYY-MM' , true);
    let momentYYYYMMDDDate = moment(date , 'YYYY-MM-DD', true);
    let momentVaildArr = [momentYYYYDate.isValid() ,  momentYYYYMMDate.isValid() ,momentYYYYMMDDDate.isValid()];
    let momentArray = [momentYYYYDate , momentYYYYMMDate , momentYYYYMMDDDate];
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
    //console.log(momentArray[momentValidIndex]);
    queryBuilder = dateQueryBuilder[queryPrefix](queryBuilder , field , date , inputFormat[momentValidIndex]);
    return queryBuilder;
}
function dateTimeQuery () {

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

module.exports = exports = {
    stringQuery: stringQuery,
    tokenQuery: tokenQuery,
    addressQuery: addressQuery ,
    nameQuery : nameQuery ,
    dateQuery : dateQuery , 
    referenceQuery : referenceQuery , 
    arrayStringBuild : arrayStringBuild
}
