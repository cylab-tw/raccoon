const mongodb = require('models/mongodb');
const moment = require('moment');
const path = require('path');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

module.exports.Refresh_Param = async function (queryParameter) {
    return new Promise((resolve) => {
        let keys = Object.keys(queryParameter);
        for (let i = 0; i < keys.length; i++) {
            if (!queryParameter[keys[i]] || queryParameter[keys[i]] == "" || queryParameter[keys[i]] == undefined) {
                delete queryParameter[keys[i]]
            }
        }
        return resolve(queryParameter);
    });
}

module.exports.strToRegex = function (str) {
    str = str.replace(/[\\(\\)\\-\\_\\+\\=\\\/\\.\\^]/g, '\\$&');
    str = str.replace(/[\*]/g, '\\.$&');
    return new RegExp(str, 'gi');
}
module.exports.ToRegex = async function (i_Item) {
    return new Promise(async (resolve) => {
        let keys = Object.keys(i_Item);
        for (let i = 0; i < keys.length; i++) {
            if (typeof (i_Item[keys[i]]) == "string") {
                i_Item[keys[i]] = i_Item[keys[i]].replace(/[\\(\\)\\-\\_\\+\\=\\\/\\.\\^]/g, '\\$&');
                i_Item[keys[i]] = i_Item[keys[i]].replace(/[\*]/g, '\\.$&');
                i_Item[keys[i]] = new RegExp(i_Item[keys[i]], 'gi');
            } else if (_.isObject(i_Item[keys[i]])) {
                await exports.ToRegex(i_Item[keys[i]]);
            }
        }
        return resolve(i_Item);
    });
}

module.exports.textSpaceToOrCond = async function (str) {
    return new Promise((resolve) => {
        if (str) {
            str = str.replace(/ /gm, '|');
            return resolve(str);
        }
        return resolve(undefined);
    });
}
//#region loging auth api
module.exports.isLogin = async function (req, res, next) {
    console.log(req.isAuthenticated() + " " + req.user + " Is LoggedIn");
    let isNormalLogin = req.isAuthenticated();
    let isTokenLogin = await exports.isTokenLogin(req);
    let isAuthenticated = (isNormalLogin || isTokenLogin);
    if (isAuthenticated) {
        return next();
    }
    res.status(401);
    res.render(path.join(__dirname + "/../public/html/errors", "401.html"));
}

module.exports.isAdminLogin = async function (req, res, next) {
    console.log(req.isAuthenticated() + " " + req.user + " Is LoggedIn");
    let isNormalLogin = req.isAuthenticated();
    let isTokenLogin = await exports.isTokenLogin(req);
    let isAuthenticated = (isNormalLogin || isTokenLogin);
    if (isAuthenticated && req.user.toLowerCase() == "admin") {
        return next();
    }
    res.redirect('/');
}
module.exports.isAdmin = async function (req, res, next) {
    let isNormalLogin = req.isAuthenticated();
    let isTokenLogin = await exports.isTokenLogin(req);
    let isAuthenticated = (isNormalLogin || isTokenLogin);
    if (isAuthenticated && req.user.toLowerCase() == "admin") {
        return next();
    }
    res.status(403);
    res.render(path.join(__dirname + "/../public/html/errors", "403.html"));
}

module.exports.isTokenLogin = async function (req, res, next) {
    return new Promise((resolve) => {
        let token = _.get(req.headers, "authorization");
        if (!token) {
            return resolve(false);
        }
        token = token.split(' ')[1];
        jwt.verify(token, "MicalaSecretSalt", function (err, decoded) {
            if (err) {
                return resolve(false);
            }
            mongodb.users.findOne({ token: token }, function (err, user) {
                if (err || !user) {
                    return resolve(false);
                }
                req.user = user.account;
                return resolve(true);
            });
        })
    })
}
//#endregion

//#region  moment compare function 
module.exports.momentDateFunc = {
    ">": (value, date) => {
        return moment(value).isAfter(date);
    },
    "<": (value, date) => {
        return moment(value).isBefore(date);
    },
    ">=": (value, date) => {
        return moment(value).isSameOrAfter(date);
    },
    "<=": (value, date) => {
        return moment(value).isSameOrBefore(date);
    },
    "-": (value, date1, date2) => {
        return moment(value).isBetween(date1, date2);
    }
}
//#endregion
//#region mongodb 日期
const dateCallBack = {
    '>': gt_Date, '<': lt_Date, '<=': lte_Date, '>=': gte_Date, '<>': ne_Date, '-': between_Date, '=': eq_Date
};

module.exports.cleanDoc = async function (data) {
    return new Promise((resolve) => {
        let cleanArray = (o) => _.isArray(o) ? _.compact(o) : o;

        let clean = o => _.transform(o, (r, v, k) => {
            let isObject = _.isObject(v);
            let val = isObject ? cleanArray(clean(v)) : v;
            let keep = isObject ? !_.isEmpty(val) : Boolean(val);
            if (keep) {
                r[k] = val;
            }
        });

        let result = clean(data);
        return resolve(result);
    });
}
function getDeepKeys(obj) {
    let keys = [];
    for (let key in obj) {
        keys.push(key);
        if (typeof obj[key] === "object") {
            let subkeys = getDeepKeys(obj[key]);
            keys = keys.concat(subkeys.map(function (subkey) {
                return key + "." + subkey;
            }));
        }
    }
    return keys;
}

module.exports.getDeepKeys = getDeepKeys;

module.exports.getObjectBelong = async function (iArr, uid, element) {
    return new Promise((resolve) => {
        const arrayHashmap = iArr.reduce((obj, item) => {
            let itemWithUid = _.get(item, uid.toString());
            obj[itemWithUid] ? obj[itemWithUid][element].push(...item[element]) : (obj[itemWithUid] = { ...item });
            return obj;
        }, {});
        const mergedArray = Object.values(arrayHashmap);
        return resolve(mergedArray);
    });
}

function getDateCondition(iDate) {
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

function gt_Date(i_Date) {
    let query =
    {
        $gt: moment(i_Date[0], 'YYYYMMDD').toDate()
    };
    return query;
}
function lt_Date(i_Date) {
    let query =
    {
        $lt: moment(i_Date[0], 'YYYYMMDD').toDate()
    };
    return query;
}
function gte_Date(i_Date) {
    let query =
    {
        $gte: moment(i_Date[0], 'YYYYMMDD').toDate()
    };
    return query;
}
function lte_Date(i_Date) {
    let query =
    {
        $lte: moment(i_Date[0], 'YYYYMMDD').toDate()
    };
    return query;
}
function between_Date(i_Date) {
    let query =
    {
        $gte: moment(i_Date[0], 'YYYYMMDD').toDate(),
        $lte: moment(i_Date[1], 'YYYYMMDD').toDate()
    };
    return query;
}
function ne_Date(i_Date) {
    let query =
    {
        $ne: moment(i_Date[0], 'YYYYMMDD').toDate()
    };
    return query
}
function eq_Date(i_Date) {
    let d = moment(i_Date[0], 'YYYYMMDD');

    if (i_Date[0].length <= 4) {
        let end = moment(i_Date[0], 'YYYYMMDD').endOf('year');

        return between_Date([d, end]);
    }
    else if (i_Date[0].length >= 5 && i_Date[0].length <= 6) {
        let end = moment(i_Date[0], 'YYYYMMDD').endOf('month');
        return between_Date([d, end]);
    }
    else {
        let end = moment(i_Date[0], 'YYYYMMDD').endOf('day');
        return between_Date([d, end]);
    }
}
//#endregion


module.exports.esFunc = {
    getBasicDSLBody: (req, query) => {
        return new Promise((resolve, reject) => {
            const from = req.query.skip;
            const size = req.query.limit;
            const index = req.params.index;
            let searchObj = {
                index: index,
                body: query
            };
            if (from) {
                searchObj.from = from;
            }
            if (size) {
                searchObj.size = size;
            }
            return resolve(searchObj);
        });
    },
    getHighLight: (highlight) => {
        const template = {
            "pre_tags": [
                `<span class=${highlight.class}>`
            ],
            "post_tags": [
                "</span>"
            ],
            "fields": {
                [highlight.field]: {
                    "require_field_match": false,
                    "number_of_fragments": 10,
                    "fragment_size": 100,
                    "no_match_size": 20
                }
            }
        };
        return template;
    },
    searchNormal: (field, query) => {
        const template = {
            "query": {
                "bool": {
                    "should": [
                        {
                            "match": {
                                [field]: {
                                    "query": query
                                }
                            }
                        },
                        {
                            "match": {
                                [field]: {
                                    "query": query,
                                    "operator": "and"
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                [field]: {
                                    "query": query,
                                    "boost": 2
                                }
                            }
                        }
                    ]
                }
            }
        }
        return template;
    },
    searchMust: (query) => {
        const template = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "analyzer": "standard",
                                "type": "phrase_prefix",
                                "boost": 3,
                                "fields": ["*"],
                            }
                        }
                    ]
                }
            }
        }
        return template;
    },
    searchAllFields: (query, include, exclude, highlight) => {
        const template = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "analyzer": "standard",
                                "type": "best_fields",
                                "boost": 1,
                                "fuzziness": 1,
                                "fields": ["*"],
                                "operator": "or"
                            }
                        }
                    ],
                    "should": [
                        {
                            "multi_match": {
                                "query": query,
                                "analyzer": "standard",
                                "type": "phrase_prefix",
                                "boost": 1.5,
                                "fields": ["*"]
                            }
                        },
                        {
                            "multi_match": {
                                "query": query,
                                "analyzer": "standard",
                                "type": "best_fields",
                                "boost": 2,
                                "fuzziness": 1,
                                "fields": ["*"],
                                "operator": "and"
                            }
                        }
                    ]
                }
            }
        }
        if (include) {
            _.set(template, "_source.include", include);
        }
        if (exclude) {
            _.set(template, "_source.exclude", exclude);
        }
        if (highlight) {
            _.set(template, "highlight", {
                "pre_tags": [
                    `<span class=${highlight.class}>`
                ],
                "post_tags": [
                    "</span>"
                ],
                "fields": {
                    [highlight.field]: {
                        "require_field_match": false,
                        "number_of_fragments": 10,
                        "fragment_size": 100,
                        "no_match_size": 20
                    }
                }
            })
        }
        return template;
    },
    searchTerm: (field, query) => {
        const template = {
            "query": {
                "term": {
                    [field]: {
                        "value": query
                    }
                }
            }
        }
        return template;
    },
    searchWildCard: (field, query) => {
        const template = {
            "query": {
                "wildcard": {
                    [field]: {
                        "value": query
                    }
                }
            }
        }
        return template;
    },
    aggs: (aggName, method, value) => {
        const template = {
            "aggs": {
                [aggName]: {
                    [method]: value
                }
            }
        }
    },
    aggsTerms: (name, termsField, size, missing) => {
        let template = {
            "aggs": {
                [name]: {
                    "terms": {
                        "field": termsField,
                        "size": size
                    }
                }
            }
        }
        _.setWith(template, `aggs.${name}.terms.missing`, missing, Object);
        return template;
    },
    aggsFacetsNested: (name, nestedField, termsField, size) => {
        const template = {
            "aggs": {
                [name]: {
                    "nested": {
                        "path": nestedField
                    },
                    "aggs": {
                        "termAgg": {
                            "terms": {
                                "field": termsField,
                                "size": size
                            }
                        }
                    }
                }
            }
        }
        return template;
    },
    aggsFilter: (aggName, field, value) => {
        const template = {
            "aggs": {
                [aggName]: {
                    "filter": {
                        "term": {
                            [field]: value
                        }
                    }
                }
            }
        }
        return template;
    },
    aggDate: (name, field, dateInterval, format) => {
        const template = {
            "aggs": {
                [name]: {
                    "date_histogram": {
                        "field": field,
                        "calendar_interval": dateInterval,
                        "min_doc_count": 1,
                        "format": format
                    }
                }
            }
        }
        return template;
    },
    boolFilterTerm: (field, value) => {
        const template = {
            "filter": [
                {
                    "term": {
                        [field]: value
                    }
                },
            ]
        }
        return template;
    },
    boolFilterTerms: (field, value) => {
        const template = {
            "filter": [
                {
                    "terms": {
                        [field]: value
                    }
                },
            ]
        }
        return template;
    },
    boolFilterRange: (field, value) => {
        const template = {
            "filter": [
                {
                    "term": {
                        [field]: value
                    }
                },
            ]
        }
    },
    boolFilterMissing: (field) => {
        const template = {
            "filter": [
                {
                    "bool": {
                        "must_not": {
                            "exists": {
                                "field": field
                            }
                        }
                    }
                }
            ]
        }
        return template;
    },
    boolFilterNested: (nestedField, queryField, searchMethod, value) => {
        const template = {
            "filter": [
                {
                    "nested": {
                        "path": nestedField,
                        "query": {
                            "bool": {
                                "must": [
                                    {
                                        [searchMethod]: {
                                            [queryField]: value
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ]
        }
        return template;
    },
    dateFunc: {
        getDateCondition: getDateCondition,
        getDateStr: getDateStr,
        eq_Date: (iDate) => {

        },
        ">": (i_Date, field) => { //gt
            let query = {
                range: {
                    [field]: {
                        gt: moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        },
        "<": (i_Date, field) => { //lt
            let query = {
                range: {
                    [field]: {
                        lt: moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        },
        ">=": (i_Date, field) => { //gte
            let query = {
                range: {
                    [field]: {
                        gte: moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        },
        "<=": (i_Date, field) => { //lte
            let query = {
                range: {
                    [field]: {
                        lte: moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        },
        "-": (i_Date, field) => { //between
            let query = {
                range: {
                    [field]: {
                        gte: moment(i_Date[0], 'YYYYMMDD').toDate(),
                        lte: moment(i_Date[1], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        },
    }

}