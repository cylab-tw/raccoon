const router = require("express").Router();
const { isLogin } = require("../middleware/index");
const { pluginsConfig } = require("../../config");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const passport = require("passport");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const loginPlugin = pluginsConfig.login;
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
        isAdmin: userType
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
            messages: req.flash("error")[0]
        });
    }
});
//#endregion

router.post("/login", function (req, res, next) {
    passport.authenticate(
        "local-login",
        {
            session: loginPlugin.session
        },
        async function (err, user, info) {
            if (!user) {
                return res.status(401).json({
                    message: info.message,
                    code: 2,
                    token: undefined
                });
            }
            req.login(user, async (err) => {
                if (err) return next(err);

                let token = await generateToken(req.user);
                let resMessage = {
                    message: "authenticate successful",
                    code: 1
                };
                if (!pluginsConfig.login.session) _.set(resMessage, "token", token);
                return res.json(resMessage);
            });
        }
    )(req, res, next);
});

router.post("/login/token", function(req, res, next) {
    passport.authenticate("jwt", {
        session: false
    }, function(err, user) {
        if (err) return next(err);
        if (!user) return res.status(401).json({
            message: "Invalid token",
            code: 2
        });

        return res.json({
            message: "authenticate successful",
            code: 1
        });
    })(req, res, next);
});

async function generateToken(user) {
    try {
        let username = user.user;
        let token = jwt.sign(
            { sub: username, userType: user.userType },
            loginPlugin.jwt.secretOrKey,
            {
                expiresIn: loginPlugin.jwt.expiresIn
            }
        );
        await mongoose.model("users").findOneAndUpdate(
            {
                account: username
            },
            {
                $set: {
                    token: token
                }
            }
        );
        return token;
    } catch (e) {
        throw e;
    }
}


module.exports = router;
