
const https = require("https");
const url  = require('url');
const md5 = require("md5");
const { pluginsConfig } = require("../../config");
const { reject, result } = require("lodash");
const ckanPlugin = pluginsConfig.ckan;

/**
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Reponse} res 
 * @param {*} next 
 * @returns 
 */
module.exports.ckanCollaboratorCheck = async function (req, res, next) {
    // if enable ckan plugin
    if (ckanPlugin.enable) {
        if(req.headers["package_id"] != undefined && req.headers["email"] != undefined) {

            let urlPath = url.parse(req.url).pathname;
            console.log(`Request URL Path: [${urlPath}]`);
            let uidData = getUIDsInUrl(urlPath);
            console.log(`UID Datas: [${JSON.stringify(uidData)}]`);
            let ckanToken = ckanPlugin.ckanToken;
            let ckanUserlist = await getCkanUserList();
            let pkgID = req.headers["package_id"];

            // get input email in md5
            let inputEmailHash = md5(req.headers["email"]);

            // find out if input email is in ckan user list.
            for(let i = 0 ; i < ckanUserlist.length; i++) {
                // if find user in ckan
                if(ckanUserlist[i].email === inputEmailHash) {
                    console.log(`User Data: ${JSON.stringify(ckanUserlist[i])}`);
                    // find out if user's package collaborator list has input package id
                    let packageCollaborators =  await getCkanPackageCollaborators(ckanToken, pkgID);
                    console.log(`Collaborators in package [${pkgID}]: [${JSON.stringify(packageCollaborators)}]`);
                    for(let j = 0 ; j < packageCollaborators.length; j++){
                        if(packageCollaborators[j].user_id == ckanUserlist[i].id) {
                            console.log(`User [${ckanUserlist[i].name}] is in package [${pkgID}]`);
                            
                            // find out if uid is really in dataset
                            if((await getUIDInCkan(uidData, pkgID)).length > 0) {
                                console.log(`UID Data [${JSON.stringify(uidData)}] is in package [${pkgID}]`);
                                return next();
                            }
                            else {
                                console.log(`UID Data [${JSON.stringify(uidData)}] is NOT in package [${pkgID}]`);
                                return res
                                .status(401)
                                .render(
                                    "html/errors/401.html"
                                );
                            }
                        }
                    }
                    // if package id is not in package list
                    console.log(`User [${ckanUserlist[i].name}] is not in package [${req.headers["package_id"]}]`);
                    return res
                    .status(401)
                    .render(
                        "html/errors/401.html"
                    );
                }
            }
            // if user is not in ckan user list
            console.log(`User is not in ckan user list`);
            return res
            .status(401)
            .render(
                "html/errors/401.html"
            );
        }
        else {
            // if req headers missing value
            console.log("Ckan auth request header is missing value");
            return res
            .status(401)
            .render(
                "html/errors/401.html"
            );
        }
    } // if plugin is not enabled then ignore
    else {
        return next();
    }
};

function getUIDsInUrl(inputUrl) {
    let uidData = {
        study:"",
        series:"",
        instance:""
    };
    let theUrl = inputUrl.toLowerCase();
    let urlData = theUrl.replace("/dicom-web/studies/","").replace("/series/",",").replace("/instances/",",").split(",");
    uidData.study = urlData.length > 0 ? urlData[0] : "";
    uidData.series = urlData.length > 1 ? urlData[1] : "";
    uidData.instance = urlData.length > 2 ? urlData[2] : "";
    return uidData;
}

async function getUIDInCkan(uidData,pkgID) {
    let resourceList = await getCkanPackageResourceMetaData(pkgID);
    let resultData = [];
    for(let i = 0; i < resourceList.length; i++) {
        console.log(`Searching Resource [${resourceList[i].id}] for UID`);
        let theSQL = `SELECT `;
        if(uidData.study != "") {
            theSQL += `"StudyInstanceUID"`;
        }
        if(uidData.series != "") {
            theSQL += `,"SeriesInatanceUID"`;
        }
        if(uidData.instance != "") {
            theSQL += `,"SOPInstanceUID"`;
        }
        theSQL += ` FROM "${resourceList[i].id}" WHERE `;
        if(uidData.study != "") {
            theSQL += `"StudyInstanceUID" = '${uidData.study}'`;
        }
        if(uidData.series != "") {
            theSQL += ` AND "SeriesInatanceUID" = '${uidData.series}'`;
        }
        if(uidData.instance != "") {
            theSQL += ` AND "SOPInstanceUID" = '${uidData.instance}'`;
        }
        let queryResult = await getDataInCkanBySQL(theSQL);
        console.log(`${queryResult.length} Results`);
        resultData = resultData.concat(queryResult);
    }
    return resultData;
}

async function getDataInCkanBySQL(sqlQuery) {
    let outputList = [];

    const options = {
        hostname: ckanPlugin.host,
        path: encodeURI(ckanPlugin.searchPath + `?sql=${sqlQuery}`),
        port: ckanPlugin.port,
        method: 'GET',
        headers: {
            Authorization:ckanPlugin.ckanToken
        }
    };
    return new Promise((resolve) => {
        https.get(options, (response) => {
            let resData = "";

            // data downloading
            response.on("data", function (chunk) {
                resData += chunk;
            });

            // http complete
            response.on("end", function () {
                // status code 200 is okay 
                // others are not
                if (response.statusCode == 200) {
                    // return the result list
                    outputList = JSON.parse(resData).result.records;
                    // return promise as success with the list data.
                    resolve(outputList);
                }
                else {
                    // return error
                    reject(resData);
                }
            });
        });
    });
}

async function getCkanPackageResourceMetaData(pkgID) {
    return new Promise((resolve, reject) => {
        var options = {
            hostname: ckanPlugin.host,
            path: ckanPlugin.packageShowPath + `?id=${pkgID}`,
            method: 'POST',
            headers: {
                'Accept': "*/*",
                'authorization': ckanPlugin.ckanToken
            }
        };
        https.get(options, res => {
            let resData = "";
            res.on('data', d => {
                resData += d;
            });

            res.on('end', function () {
                if (res.statusCode == 200) {
                    console.log(`Package [${pkgID}] had ${JSON.parse(resData)["result"]["resources"].length} resources`);
                    resolve(JSON.parse(resData)["result"]["resources"]);
                }
                else {
                    reject(res.statusCode);
                }
            });

            res.on('error', error => {
                reject(error);
            });
        });
    });
}

async function getCkanUserList() {
    let outputList = [];

    const options = {
        hostname: ckanPlugin.host,
        path: ckanPlugin.userListPath,
        port: ckanPlugin.port,
        headers: {
        }
    };
    return new Promise((resolve) => {
        https.get(options, (response) => {
            let resData = "";

            // data downloading
            response.on("data", function (chunk) {
                resData += chunk;
            });

            // http complete
            response.on("end", function () {
                // status code 200 is okay 
                // others are not
                if (response.statusCode == 200) {
                    // put user id and name and their email hash in the list
                    let resultData = JSON.parse(resData).result;
                    for(let i = 0 ; i < resultData.length; i++){
                        let userData = {};
                        userData["id"] = resultData[i]["id"];
                        userData["name"] = resultData[i]["name"];
                        userData["email"] = resultData[i]["email_hash"];
                        outputList.push(userData);
                    }
                }
                // return promise as success with the list data.
                resolve(outputList);
            });
        });
    });
}

async function getCkanPackageCollaborators(ckanToken, packageID) {
    let outputList = [];

    const options = {
        hostname: ckanPlugin.host,
        path: ckanPlugin.collaboratorPath + `?id=${packageID}`,
        port: ckanPlugin.port,
        method: 'GET',
        headers: {
            Authorization:ckanToken
        }
    };
    return new Promise((resolve) => {
        https.get(options, (response) => {
            let resData = "";

            // data downloading
            response.on("data", function (chunk) {
                resData += chunk;
            });

            // http complete
            response.on("end", function () {
                // status code 200 is okay 
                // others are not
                if (response.statusCode == 200) {
                    // return the result list
                    outputList = JSON.parse(resData).result;
                }
                // return promise as success with the list data.
                resolve(outputList);
            });
        });
    });
}

//#endregion
