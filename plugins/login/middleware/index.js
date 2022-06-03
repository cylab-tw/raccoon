const path = require("path");
const _ = require("lodash");

function isLogin(req, res, next) {
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

function isAdmin(req, res, next) {
    let userType = _.get(req, "user.userType", "");
    if (userType.toLowerCase() !== "admin") {
        return res.status(403).render("html/errors/403.html");
    }
    next();
}

module.exports.isLogin = isLogin;
module.exports.isAdmin = isAdmin;
