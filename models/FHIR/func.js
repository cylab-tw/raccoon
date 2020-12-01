
const bundleClass = require('../mongodb/FHIRmodel/Bundle');

function isFirst (offset) {
    return offset == 0;
}

function isHaveNext (offset , count  , totalCount) {
    return (offset+count) <= totalCount;
}
function isLast (offset , count  , totalCount) {
    return (offset+count) >= totalCount;
}

function  getUrl(params , http ="http" , resource) {
    let baseUrl =`${http}://${process.env.FHIRSERVER_HOST}:${process.env.FHIRSERVER_PORT}/${process.env.FHIRSERVER_APIPATH}/${resource}`;
    let paramsItem = [];
    for (let i in params) {
        let str = `${i}=${params[i]}`;
        paramsItem.push(str);
    }
    baseUrl = `${baseUrl}?${paramsItem.join("&")}`;
    return baseUrl;
}
function  getNextUrl(params , http ="http" , resource) {
    params["_offset"] += params["_count"];
    let baseUrl =`${http}://${process.env.FHIRSERVER_HOST}:${process.env.FHIRSERVER_PORT}/${process.env.FHIRSERVER_APIPATH}/${resource}`;
    let paramsItem = [];
    for (let i in params) {
        let str = `${i}=${params[i]}`;
        paramsItem.push(str);
    }
    baseUrl = `${baseUrl}?${paramsItem.join("&")}`;
    return baseUrl;
}
function getPreviousUrl(params , http ="http" , resource) {
    params["_offset"] -= params["_count"];
    params["_offset"] -= params["_count"];
    console.log(params["_offset"]);
    params["_offset"] = params["_offset"] < 0 ? 0 : params["_offset"];
    let baseUrl =`${http}://${process.env.FHIRSERVER_HOST}:${process.env.FHIRSERVER_PORT}/${process.env.FHIRSERVER_APIPATH}/${resource}`;
    let paramsItem = [];
    for (let i in params) {
        let str = `${i}=${params[i]}`;
        paramsItem.push(str);
    }
    baseUrl = `${baseUrl}?${paramsItem.join("&")}`;
    return baseUrl;
}

function getEntryFullUrl(item , http="http" ,resource) {
    let url = `${http}://${process.env.FHIRSERVER_HOST}:${process.env.FHIRSERVER_PORT}/${process.env.FHIRSERVER_APIPATH}/${resource}/${item.id}`
    return url;
}

function createBundle (req ,  docs , count , skip , limit , resource) {
    let bundle = new bundleClass.Bundle();
    bundle.type = "searchset";
    bundle.total = count;
    if (isFirst(skip)) {
        let url = getUrl(req.query , "http" , resource);
        let link = new bundleClass.link("self" , url);
        bundle.link.push(link);
        if (isHaveNext(skip , limit , count)) {
            let nextUrl = getNextUrl(req.query , "http",resource);
            let nextLink = new bundleClass.link("next" , nextUrl);
            bundle.link.push(nextLink);
        }
        
    } else if (isLast(skip , limit , count)) {
        let url = getUrl(req.query , "http" , resource);
        let link = new bundleClass.link("self" , url);
        let preUrl = getPreviousUrl(req.query , "http" , resource);
        let preLink = new bundleClass.link("previous" , preUrl);
        bundle.link.push(link);
        bundle.link.push(preLink);
    } else {
        let url = getUrl(req.query , "http" ,resource);
        let link = new bundleClass.link("self" , url);
        if (isHaveNext(skip , limit , count)) {
            let nextUrl = getNextUrl(req.query , "http" , resource);
            let nextLink = new bundleClass.link("next" , nextUrl);
            bundle.link.push(nextLink);
        }
        let preUrl = getPreviousUrl(req.query , "http"  ,resource);
        let preLink = new bundleClass.link("previous" , preUrl);
        bundle.link.push(link);
        bundle.link.push(preLink);
    }
    for(let i in docs) {
        let entry = new bundleClass.entry(getEntryFullUrl(docs[i] , "http", docs[i].resourceType) , docs[i]);
        bundle.entry.push(entry);
    }
    return bundle;
}

module.exports = {
    createBundle : createBundle , 
    getEntryFullUrl : getEntryFullUrl
}
