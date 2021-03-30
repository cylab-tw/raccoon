const queryBuild = require('models/FHIR/queryBuild.js');
const _ = require('lodash');
const mongodb = require('models/mongodb');
const {createBundle} = require('models/FHIR/func');
const {handleError} = require('../../../../models/FHIR/httpMessage');

let errorMessage = false;
module.exports = async function (req, res) {
    let queryParameter =  _.cloneDeep(req.query);
    let paginationSkip = queryParameter['_offset'] == undefined ? 0 : queryParameter['_offset'];
    let paginationLimit = queryParameter['_count'] == undefined ? 100 : queryParameter['_count'];
    _.set(req.query , "_offset" ,paginationSkip);
    _.set(req.query , "_count" , paginationLimit);
    let realLimit = paginationLimit+ paginationSkip;
    delete queryParameter['_count'];
    delete queryParameter['_offset'];
    Object.keys(queryParameter).forEach(key => {
        if (!queryParameter[key] || _.isPlainObject(queryParameter[key] || key == "_include")) {
            delete queryParameter[key];
        }
    });
    queryParameter.$and = [];
    for (let key in queryParameter) {
        try {
            buildFunc[key](queryParameter);
        } catch (e) {
            if (key != "$and") {
                console.log(e);
                return res.status(400).send(handleError.processing(`Unknown search parameter ${key}`))
            }
        }
    }
    if (errorMessage) {
        return res.status(400).json(errorMessage);
    }
    const FHIRFilter = {
        _id: 0,
        __v: 0,
        'name._id': 0
    }
    if (queryParameter.$and.length == 0) {
        delete queryParameter["$and"];
    }
    try {
        //let docs = await mongoFunc.findFilterFields('patients', queryParameter, FHIRFilter, paginationLimit, paginationSkip);
        let docs = await mongodb.patients.find(queryParameter ,FHIRFilter).
        limit(realLimit).
        skip(paginationSkip).
        exec();
        for (let i in docs) {
            docs[i] = await docs[i].getFHIRField();
        }
        let _include = _.get(req.query , "_include");
        if (_include) {
            if (typeof _include == "string")  {
                _include = [_include];
            } 
            for (let i of _include) {
                if (!includeSearch[i]) {
                    return res.status(400).send(handleError.exception(`Unknow parameter ${i}`));
                }
                await includeSearch[i](docs);
            }
        }
        let count = await mongodb.patients.countDocuments(queryParameter);
        let bundle = createBundle(req , docs , count , paginationSkip , paginationLimit , "Patient");
        /*let bundle = new bundleClass.Bundle();
        bundle.type = "searchset";
        bundle.total = count;
        if (isFirst(paginationSkip)) {
            let url = getUrl(req.query , "http");
            let link = new bundleClass.link("self" , url);
            let nextUrl = getNextUrl(req.query , "http");
            let nextLink = new bundleClass.link("next" , nextUrl);
            bundle.link.push(link);
            bundle.link.push(nextLink);
        } else if (isLast(paginationSkip , paginationLimit , count)){
            let url = getUrl(req.query , "http");
            let link = new bundleClass.link("self" , url);
            let preUrl = getPreviousUrl(req.query , "http");
            let preLink = new bundleClass.link("previous" , preUrl);
            bundle.link.push(link);
            bundle.link.push(preLink);
        } else {
            let url = getUrl(req.query , "http");
            let link = new bundleClass.link("self" , url);
            let nextUrl = getNextUrl(req.query , "http");
            let nextLink = new bundleClass.link("next" , nextUrl);
            let preUrl = getPreviousUrl(req.query , "http");
            let preLink = new bundleClass.link("previous" , preUrl);
            bundle.link.push(link);
            bundle.link.push(nextLink);
            bundle.link.push(preLink);
        }
        for(let i in docs) {
            let entry = new bundleClass.entry(getEntryFullUrl(docs[i]) , docs[i]);
            bundle.entry.push(entry);
        }*/
        return res.status(200).json(bundle);
    } catch (e) {
        return res.status(500).json(handleError.exception(`server has something error ${e}`));
    }
};

const buildFunc = {
    "_id" : (query) => {
        query.$and.push({
            id : query["_id"]
        });
        delete query["_id"];
    } ,
    "given": (query) => {
        //arrayStringBuild (query ,"given" , "name.given" , ["given"]);
        queryBuild.arrayStringBuild(query ,"given" , "name.given" , ["given"]);
        //stringBuild(query , "given" , "name.given" , ["given"]);
    } , 
    "given:contains" : (query) => {
       /* stringBuild(query , "given:contains" , "name.given" , ["given" , "given:contains"]);*/
        queryBuild.arrayStringBuild(query ,"given:contains" , "name.given" , ["given" , "given:contains"]);
    } ,
    "given:exact" : (query) => {
        stringBuild(query , "given:exact" , "name.given" , ["given" ,"given:exact"]);
    } ,
    "identifier" : (query) => {
        let buildResult = queryBuild.tokenQuery(query["identifier"] , "value" , "identifier" ,"");
        for (let i in buildResult) {
            query.$and.push({
                [i] : buildResult[i]
            });
        }
        delete query['identifier'];
    } ,
    "family": (query) => {
        stringBuild(query , "family" , "name.family" , ["family"]);
    } , 
    "family:contains" : (query) => {
        stringBuild(query , "family:contains" , "name.family" , ["family" , "family:contains"]);
    } ,
    "family:exact" : (query) => {
        stringBuild(query , "family:exact" , "name.family" , ["family" ,"family:exact"]);
    } ,
    "name" : (query) => {
        if (!_.isArray(query["name"])) {
            query["name"] = [query["name"]]
        }
        for (let item of query["name"]) {
            let buildResult = queryBuild.nameQuery(item , "name");
            query.$and.push(buildResult);
        }
        //let buildResult = queryBuild.nameQuery(query["name"] , "name");
        //query.$and.push(buildResult);
        delete query['name'];
    },
    "name:contains" : (query) => {
        let buildResult = queryBuild.nameQuery(query["name:contains"] , "name:contains");
        query.$and.push(buildResult);
        delete query['name:contains'];
    },
    "name:exact" : (query) => {
        let buildResult = queryBuild.nameQuery(query["name:exact"] , "name:exact");
        query.$and.push(buildResult);
        delete query['name:exact'];
    },
    "gender" : (query) => {
        query.$and.push({
            "gender" : query["gender"]
        });
        delete query["gender"];
    },
    "active" : (query) => {
        query.$and.push({
            "active" : query["active"]
        });
        delete query["active"];
    } ,
    "email" : (query) => {
        let buildResult =queryBuild.tokenQuery(query["email"] , "value" , "telecom" , "email");
        for (let i in buildResult) {
            query.$and.push({
                [i] : buildResult[i]
            });
        }
        delete query['email'];
    } , 
    "address" : (query) => {
        let buildResult = queryBuild.addressQuery(query["address"] ,"address");
        query.$and.push(buildResult);
        delete query['address'];
    } ,
    "address:contains" : (query) => {
        let buildResult = queryBuild.addressQuery(query["address:contains"] ,"address:contains");
        query.$and.push(buildResult);
        delete query['address:contains'];
    } ,
    "address:exact" : (query) => {
        let buildResult = queryBuild.addressQuery(query["address:exact"] ,"address:exact");
        query.$and.push(buildResult);
        delete query['address:exact'];
    } ,
    "address-city" : (query) => {
        stringBuild(query , "address-city" , "address.city" , ["address-city"]);
    } ,
    "address-city:contains" : (query) => {
        stringBuild(query , "address-city:contains" , "address.city" , ["address-city" , "address-city:contains"]);
    } ,
    "address-city:exact" : (query) => {
        stringBuild(query , "address-city:exact" , "address.city" , ["address-city" , "address-city:exact"]);
    } ,
    "address-country" : (query) => {
        stringBuild(query , "address-country" , "address.country" , ["address-country"]);
    } ,
    "address-country:contains" : (query) => {
        stringBuild(query , "address-city:contains" , "address.country" , ["address-country" , "address-country:contains"]);
    } ,
    "address-country:exact" : (query) => {
        stringBuild(query , "address-country:exact" , "address.country" , ["address-country" , "address-country:exact"]);
    } ,
    "address-postalcode" : (query) => {
        stringBuild(query , "address-postalcode" , "address.postalcode" , ["address-postalcode"]);
    } ,
    "address-postalcode:contains" : (query) => {
        stringBuild(query , "address-postalcode:contains" , "address.postalcode" , ["address-postalcode" , "address-postalcode:contains"]);
    } ,
    "address-postalcode:exact" : (query) => {
        stringBuild(query , "address-postalcode:exact" , "address.postalcode" , ["address-postalcode" , "address-postalcode:exact"]);
    } ,
    "address-state" : (query) => {
        stringBuild(query , "address-state" , "address.state" , ["address-state"]);
    } ,
    "address-state:contains" : (query) => {
        stringBuild(query , "address-state:contains" , "address.state" , ["address-state" , "address-state:contains"]);
    } ,
    "address-state:exact" : (query) => {
        stringBuild(query , "address-state:exact" , "address.state" , ["address-state" , "address-state:exact"]);
    } ,
    "address-use" : (query) => {
        stringBuild(query , "address-use" , "address.use" , ["address-use"]);
    } ,
    "address-use:contains" : (query) => {
        stringBuild(query , "address-use:contains" , "address.use" , ["address-use" , "address-use:contains"]);
    } ,
    "address-use:exact" : (query) => {
        stringBuild(query , "address-use:exact" , "address.use" , ["address-use" , "address-use:exact"]);
    } ,
    "birthdate" : (query) => {
        if (!_.isArray(query["birthdate"])) {
            query["birthdate"] = [query["birthdate"]]
        }
        for (let i in query["birthdate"]) {
            let buildResult = queryBuild.dateQuery(query["birthdate"][i] , "birthdate");
            query.$and.push(buildResult);
            if (!buildResult) {
                errorMessage = handleError.processing(`invalid date:${query["birthdate"]}`)
            }
        }
        delete query["birthdate"];
    } , 
    "organization" : (query) => {
        let buildResult = queryBuild.referenceQuery(query["organization"] , "managingOrganization.reference");
        for (let i in buildResult) {
            query.$and.push({
                [i] : buildResult[i]
            });
        }
        delete query['organization'];
    }
}

function stringBuild (query , field , queryField ,deleteFields=['']) {
    let buildResult = queryBuild.stringQuery(query[field] , field);
    query.$and.push({
        [queryField]: buildResult
    });
    for (let i of deleteFields) {
        delete query[i];
    }
}
function arrayAddressBuild (query , field , queryField) {
    if (!_.isArray(query[field])) {
        query[field] = [query[field]];
    }
    let buildResult = queryBuild.addressQuery(query[field] ,queryField);
    query.$and.push(buildResult);
    delete query[field];
}


const includeSearch = {
    "Patient:organization" :async (result) =>{
        let organizationArr = [];
        for (let i of result) {
            let orgId = _.get(i ,"managingOrganization.reference");
            if (_.isUndefined(orgId)) continue;
            orgId = orgId.replace(/organization\//gi ,"");
            let org = await mongodb.organization.findOne({id : orgId}).exec();
            if (org)  {
                organizationArr.push(org.getFHIRField());
            }
        }
        result.push(...organizationArr);
    } ,
}
