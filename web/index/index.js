const express = require('express');
const router = express.Router();
const _ = require("lodash");
const { pluginsConfig } = require("../../plugins/config");

let loginPlugin = pluginsConfig.find( v=> v.name === "login");
router.get('/', function (req, res) {
    let user = _.get(req, "user.user");
    let userType = _.get(req, "user.userType");
    res.render("html/index.html", {
        user: user,
        isAdmin: userType,
        loginEnable: loginPlugin.enable
    });
});

module.exports = router;