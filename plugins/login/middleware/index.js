const path = require("path");
const _ = require("lodash");
const { pluginsConfig } = require("../../config");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

async function isLogin(req, res, next) {
    
    if (!pluginsConfig.login.session) {
        try {
            await checkToken(req);
        } catch (e) {
            console.error(e);
            return res.status(401).render(
                path.join(
                    __dirname + "../../../../public/html/errors/",
                    "401.html"
                )
            );
        }
    }


    let username = _.get(req, "user.user");
    console.log(req.isAuthenticated() + " " + username + " Is LoggedIn");
    let isNormalLogin = req.isAuthenticated();
    let isAuthenticated = isNormalLogin;
    if (isAuthenticated) {
        return next();
    }
    res.status(401);
    res.render(
        path.join(__dirname + "../../../../public/html/errors/", "401.html")
    );
}

/**
 * 
 * @param {import("express").Request} req 
 */
function checkToken(req) {
    return new Promise(async (resolve, reject) => {
        let tokenInHeader = _.get(req.headers, "authorization", "");
        let token = tokenInHeader.replace("Bearer ", "");
        if (!token) return reject(new Error("Invalid token"));
        let userDoc = await mongoose.model("users").findOne({
            token: token
        });
        if (userDoc) {
            jwt.verify(
                token,
                pluginsConfig.login.jwt.secretOrKey,
                (err, decoded) => {
                    if (err) return reject(err);
                    return resolve(decoded);
                }
            );
        }
        return reject(new Error("Token not found"));
    });
    
}

async function isAdmin(req, res, next) {

    if (!pluginsConfig.login.session) {
        try {
            let tokenDecoded = await checkToken(req);
            if (tokenDecoded.sub === "admin") {
                return next();
            }
             return res.render("html/errors/403.html");
        } catch (e) {
            return res.render("html/errors/401.html");
        }
    }

    let userType = _.get(req, "user.userType", "");
    if (userType.toLowerCase() !== "admin") {
        return res.status(403).render("html/errors/403.html");
    }
    next();
}

module.exports.isLogin = isLogin;
module.exports.isAdmin = isAdmin;
module.exports.checkToken = checkToken;
