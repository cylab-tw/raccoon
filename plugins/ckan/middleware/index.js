
const path = require("path");
const _ = require("lodash");
const https = require("https");
const md5 = require("md5");
const querystring = require("querystring");
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
        if(req.headers["ckan_token"] != undefined && req.headers["package_id"] != undefined && req.headers["email"] != undefined){

            let ckan_userlist = await GetCkanUserList();

            // get input email in md5
            let i_emailhash = md5(req.headers["email"]);
            console.log(`email_hash=${i_emailhash}`);
            console.log(`ckan_token=${req.headers["ckan_token"]}`);

            // find out if input email is in ckan user list.
            for(let i = 0 ; i < ckan_userlist.length; i++){
                // if find user in ckan
                if(ckan_userlist[i].email === i_emailhash){
                    console.log(ckan_userlist[i]);
                    // find out if user's package collaborator list has input package id
                    let user_packages = await GetCkanUserPackageList(req.headers["ckan_token"], ckan_userlist[i].name);
                    console.log(`user_packages=${user_packages}`);
                    for(let j = 0 ; j < user_packages.length; j++){
                        console.log(`user [${ckan_userlist[i].name}] is in package [${req.headers["package_id"]}]`);
                        if(user_packages[j].package_id == req.headers["package_id"]){
                            return next();
                        }
                    }
                    // if package id is not in package list
                    console.log(`user [${ckan_userlist[i].name}] is not in package [${req.headers["package_id"]}]`);
                    return res
                    .status(401)
                    .render(
                        "html/errors/401.html"
                    );
                }
            }
            // if user is not in ckan user list
            console.log(`user [${ckan_userlist[i].name}] not in ckan user list`);
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

async function GetCkanUserList() {
    let o_list = [];

    const _options = {
        hostname: ckanPlugin.host,
        path: ckanPlugin.userlist_path,
        port: ckanPlugin.port,
        headers: {
        }
    };
    return new Promise((resolve) => {
        https.get(_options, (response) => {
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
                    let result_data = JSON.parse(resData).result;
                    for(let i = 0 ; i < result_data.length; i++){
                        let _userdata = {};
                        _userdata["id"] = result_data[i]["id"];
                        _userdata["name"] = result_data[i]["name"];
                        _userdata["email"] = result_data[i]["email_hash"];
                        o_list.push(_userdata);
                    }
                }
                // return promise as success with the list data.
                resolve(o_list);
            });
        });
    });
}

async function GetCkanUserPackageList(i_ckantoken, i_username) {
    let o_list = [];
    console.log(`username=${i_username}`);

    const _options = {
        hostname: ckanPlugin.host,
        path: ckanPlugin.collaborator_path + `?id=${i_username}`,
        port: ckanPlugin.port,
        method: 'GET',
        headers: {
            Authorization:i_ckantoken,
        }
    };
    return new Promise((resolve) => {
        https.get(_options, (response) => {
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
                    o_list = JSON.parse(resData).result;
                }
                // return promise as success with the list data.
                resolve(o_list);
            });
        });
    });
}

//#endregion
