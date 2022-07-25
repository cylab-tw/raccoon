
const https = require("https");
const md5 = require("md5");
const { pluginsConfig } = require("../../config");
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

            let ckanToken = ckanPlugin.ckanToken;
            let ckanUserlist = await getCkanUserList();
            let pkgID = req.headers["package_id"];

            // get input email in md5
            let inputEmailHash = md5(req.headers["email"]);
            console.log(`inputEmailHash=${inputEmailHash}`);
            console.log(`ckan_token=${ckanToken}`);

            // find out if input email is in ckan user list.
            for(let i = 0 ; i < ckanUserlist.length; i++) {
                // if find user in ckan
                if(ckanUserlist[i].email === inputEmailHash) {
                    console.log(ckanUserlist[i]);
                    // find out if user's package collaborator list has input package id
                    let packageCollaborators =  await getCkanPackageCollaborators(ckanToken, pkgID);
                    console.log(`packageCollaborators=${packageCollaborators}`);
                    for(let j = 0 ; j < packageCollaborators.length; j++){
                        if(packageCollaborators[j].user_id == ckanUserlist[i].id) {
                            console.log(`user [${ckanUserlist[i].name}] is in package [${pkgID}]`);
                            return next();
                        }
                    }
                    // if package id is not in package list
                    console.log(`user [${ckanUserlist[i].name}] is not in package [${req.headers["package_id"]}]`);
                    return res
                    .status(401)
                    .render(
                        "html/errors/401.html"
                    );
                }
            }
            // if user is not in ckan user list
            console.log(`user is not in ckan user list`);
            return res
            .status(401)
            .render(
                "html/errors/401.html"
            );
        }
        else {
            // if req headers missing value
            console.log("ckan auth request header missing value");
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
    console.log(`packageID=${packageID}`);

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
                console.log(resData);
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
