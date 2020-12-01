const {Client} = require("@elastic/elasticsearch");
const _ =require('lodash');
const moment = require('moment');
const fetch = require('node-fetch');
require("dotenv").config();

const elasticUrl = process.env.ELASTIC_URL || "http://localhost:9200";

const esclient = new Client({
    node: elasticUrl
});
esclient._analyze = async function (parameter) {
    try {
        let fetchRes = await fetch(`${elasticUrl}/${parameter.index}/_analyze` , {
           method : 'POST'  , 
           body : JSON.stringify(parameter.body) ,
           headers : {
               "content-type" : "application/json"
           }
        });
        return await fetchRes.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

function checkConnection() {
    return new Promise(async (resolve) => {
        console.log("Checking connection to ElasticSearch...");
        let isConnected = false;
        while (!isConnected) {
            try {
                await esclient.cluster.health({});
                console.log("Successfully connected to ElasticSearch");
                isConnected = true;
                // eslint-disable-next-line no-empty
            } catch (e) {
                console.error(e);
            }
        }
        resolve(true);
    });
}

function checkFieldDataIsHeap() {
    return new Promise(async (resolve ) => {
        console.log("Checking connection to ElasticSearch...");
        let isConnected = false;
        while (!isConnected) {
            try {
                let body = {
                    "size": 0
                };
                body["aggs"] = {
                    "my_unbiased_sample": {
                        "sampler": {
                            "shard_size": 6000
                        },
                        "aggs": {
                            "autocomplete": {
                                "terms": {
                                    "field": `Records.FULLTEXT.autocomplete`,
                                    "include": `a.*`,
                                    "order": {
                                        "_count": "desc"
                                    }
                                }
                            }
                        }
                    }
                }
                let searchBody = {
                    index : "my-report" , 
                    body : body
                }
                let startTime = Date.now();
                let data = await esclient.search(searchBody , {maxRetries:3});
                let endTime = Date.now();
                let elapsedTime = endTime  - startTime;
                if (elapsedTime < 3000) {
                    console.log("Successfully connected to ElasticSearch");
                    isConnected = true;
                }
                // eslint-disable-next-line no-empty
            } catch (e) { 
                console.error(e);
                resolve(false);
            }
        }
        resolve(true);
    });
}

function getBasicDSLBody(req, query) {
    return new Promise((resolve, reject) => {
        const from = req.query.skip;
        const size = req.query.limit;
        const index = req.params.index;
        let searchObj = {
            index: index,
            body: query
        };
        if (from) {
            from = (from >= 0 ) ? ()=>{searchObj.from = from;} : ()=> {delete from};
        }
        if (size) {
            size = (size <= 0) ? 0 : size;
            searchObj.size = size;
        }
        return resolve(searchObj);
    });
}

module.exports = {
    esclient,
    checkConnection,
    getBasicDSLBody , 
    checkFieldDataIsHeap
};

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
//#region es Function
function getHighLight(highlight) {
    if (!highlight.htmlTag) highlight.htmlTag = "";
    const template = {
        "pre_tags": [
            `<span class=${highlight.class} ${highlight.htmlTag}>`
        ],
        "post_tags": [
            "</span>"
        ] , 
        "fields" : {
            [highlight.field] : highlight.option
        }
    };
    return template;
} 
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
    getHighLight : getHighLight,
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
    searchMust : (query) => {
        const template = {
            "query" : {
                "bool" : {
                    "must" : [
                        {
                            "multi_match": { 
                                "query" : query , 
                                "analyzer": "standard",
                                "type": "phrase_prefix",
                                "boost": 3,
                                "fields": ["*"] , 
                            }
                        }
                    ]
                }
            }
        }
        return template;
    },
    searchAllFields: (query , include , exclude , highlight) => {
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
                                "fields": ["*"] , 
                                "operator" : "or"
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
                                "fields": ["*"] , 
                                "operator" : "and"
                            }
                        }
                    ]
                }
            }
        }
        if (include) {
            _.set(template , "_source.include" , include);
        }
        if (exclude) {
            _.set(template , "_source.exclude" , exclude);
        }
        if (highlight) {
            _.set(template , "highlight" , {
                "pre_tags": [
                    `<span class=${highlight.class}>`
                ],
                "post_tags": [
                    "</span>"
                ] , 
                "fields" : {
                    [highlight.field] : {
                        "require_field_match": false,
                        "number_of_fragments": 2,
                        "fragment_size": 10
                    }
                }
            })
        }
        return template;
    } , 
    searchMultiFields: (query ,  fields,include , exclude , highlight) => {
        const template = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "lenient": "true",
                                "analyzer": "standard",
                                "type": "best_fields",
                                "boost": 1,
                                "fuzziness": 1,
                                "fields": fields , 
                                "operator" : "or"
                            }
                        }
                    ],
                    "should": [
                        {
                            "multi_match": {
                                "query": query,
                                "lenient": "true",
                                "analyzer": "standard",
                                "type": "phrase",
                                "boost": 3,
                                "fields": fields
                            }
                        },
                        {
                            "multi_match": {
                                "query": query,
                                "lenient": "true",
                                "analyzer": "standard",
                                "type": "best_fields",
                                "boost": 2,
                                "fuzziness": 1,
                                "fields": fields, 
                                "operator" : "and"
                            }
                        }
                    ]
                }
            }
        }
        if (include) {
            _.set(template , "_source.include" , include);
        }
        if (exclude) {
            _.set(template , "_source.exclude" , exclude);
        }
        if (highlight) {
            _.set(template , "highlight" , getHighLight(highlight));
        }
        return template;
    } , 
    searchTerm : (field , query) => {
        const template = {
            "query" : {
                "term" : {
                    [field] : {
                        "value" : query
                    }
                }
            }
        }
        return template;
    } , 
    searchWildCard : (field , query) => {
        const template = {
            "query" : {
                "wildcard" : {
                    [field] : {
                        "value" : query
                    }
                }
            }
        }
        return template;
    } ,
    /** 
     * @param {String} field 查詢欄位
     * @param {String} method match method , e.g match_phrase , match_phrase_prefix , match
     * @param {String} query 查詢數值
    */
    queryMatch : (field , method , query ) => {
        const template = {
            "query" : {
                [method] : {
                    [field] : {
                        "query" : query
                    }
                }
            }
        }
        return template;
    } ,
    queryStringMultiFields : (fields  , query) => {
        const template = {
            "query" : {
                "query_string" : {
                    "fields" : fields ,
                    "query" : query
                } 
            }
        }
        return template;
    } ,
    aggs : (aggName , method , value) => {
        const template = {
            "aggs" : {
                [aggName] : {
                    [method] : value
                }
            }
        }
        return template;
    } ,
    aggsTerms : (name , termsField , size , missing) => {
        let template = {
            "aggs" : {
                [name] : {
                    "terms" : {
                        "field": termsField , 
                        "size" : size
                    }
                }
            }
        }
        _.setWith(template , `aggs.${name}.terms.missing` ,  missing, Object);
        return template;
    } ,
    aggsFacetsNested : (name , nestedField , termsField , size) => {
        const template = {
            "aggs" : {
                [name] : {
                    "nested" : {
                        "path" : nestedField
                    },
                    "aggs" : {
                        "termAgg" : {
                            "terms" : {
                                "field": termsField , 
                                "size" : size
                            }
                        }
                    }
                }
            }
        }
        return template;
    },
    aggsFilter : (aggName , field ,value) => {
        const template = {
            "aggs" : {
                [aggName] : {
                    "filter" : {
                        "term" : {
                            [field] : value
                        }
                    }
                }
            }
        }
        return template;
    } ,
    aggDate : (name , field , dateInterval , format) => {
        const template = {
            "aggs" : {
                [name] : {
                    "date_histogram" : {
                        "field" : field,
                        "calendar_interval" : dateInterval , 
                        "min_doc_count": 1 ,
                        "format": format
                    }
                }
            }
        }
        return template;
    } ,
    boolFilterTerm : (field , value) => {
        const template = {
            "filter": [ 
                { 
                    "term":  { 
                        [field]: value 
                    }
                },
            ]
        }
        return template;
    },
    boolFilterTerms : (field  , value) => {
        const template = {
            "filter": [ 
                { 
                    "terms":  { 
                        [field]: value 
                    }
                },
            ]
        }
        return template;
    } ,
    boolFilterRange : (field , value) => {
        const template = {
            "filter": [ 
                { 
                    "term":  { 
                        [field]: value 
                    }
                },
            ]
        }
    },
    boolFilterMissing : (field) => {
        const template = {
            "filter" : [
                {
                    "bool" : {
                        "must_not" : {
                          "exists" : {
                            "field" : field
                          }
                        }
                    }
                }
            ]
        }
        return template;
    } ,
    boolFilterNested : (nestedField , queryField , searchMethod ,value) => {
        const template = {
            "filter": [ 
                { 
                    "nested":  { 
                        "path": nestedField ,
                        "query" : {
                            "bool" : {
                                "must" : [
                                    {
                                        [searchMethod] : {
                                            [queryField] : value
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
    } ,
    dateFunc : {
        getDateCondition : getDateCondition , 
        getDateStr : getDateStr ,
        eq_Date :  (i_Date) => {
            let query = {
                range : {
                    [field] : {
                        gte: moment(i_Date[0], 'YYYYMMDD').startOf('day').toDate(),
                        lte: moment(i_Date[0], 'YYYYMMDD').endOf('day').toDate()
                    }
                }
            };
            return query;
        } , 
        ">" : (i_Date , field) => { //gt
            let query = {
                range : {
                    [field] : {
                        gt : moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        } , 
        "<" : (i_Date  , field) => { //lt
            let query = {
                range : {
                    [field] : {
                        lt : moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        } , 
        ">=" : (i_Date  , field) => { //gte
            let query = {
                range : {
                    [field] : {
                        gte : moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        } , 
        "<=" : (i_Date , field) => { //lte
            let query = {
                range : {
                    [field] : {
                        lte : moment(i_Date[0], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        } , 
        "-" : (i_Date , field) => { //between
            let query = {
                range : {
                    [field] : {
                        gte: moment(i_Date[0], 'YYYYMMDD').toDate(),
                        lte: moment(i_Date[1], 'YYYYMMDD').toDate()
                    }
                }
            };
            return query;
        } ,
    }
    
}
//#endregion