const router = require("express").Router();
const { isLogin } = require("../middleware/index");
const { pluginsConfig } = require("../../config");
const _ = require("lodash");

const loginPlugin = pluginsConfig.find((v) => v.name === "login");
for (let i = 0; i < loginPlugin.routers.length; i++) {
    let middlewareRouter = loginPlugin.routers[i];
    router[middlewareRouter.method](middlewareRouter.path, isLogin);
}

//#region Front-End router
router.get("/dicom/UserManager", function (req, res) {
    let user = _.get(req, "user.user");
    let userType = _.get(req, "user.userType");
    if (userType != "admin") res.redirect("/");
    res.render("html/UserManager.html", {
        user: user,
        isAdmin: userType,
        loginEnable: loginPlugin.enable
    });
});

router.get("/login", function (req, res) {
    let user = _.get(req, "user.user");
    let userType = _.get(req, "user.userType");
    if (req.user) {
        return res.redirect("/");
    } else {
        return res.render("html/login.html", {
            user: user,
            isAdmin: userType,
            loginEnable: loginPlugin.enable,
            messages: req.flash("error")[0]
        });
    }
});

//#endregion 

module.exports = router;
