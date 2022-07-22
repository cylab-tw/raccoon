const LocalStrategy = require("passport-local").Strategy; // eslint-disable-line @typescript-eslint/naming-convention
const mongodb = require("models/mongodb");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const JwtStrategy = require("passport-jwt").Strategy; // eslint-disable-line @typescript-eslint/naming-convention
const ExtractJwt = require("passport-jwt").ExtractJwt; // eslint-disable-line @typescript-eslint/naming-convention

const { pluginsConfig } = require("../../plugins/config");
const loginPlugin = pluginsConfig.login;

module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    passport.use(
        "local-login",
        new LocalStrategy(
            {
                usernameField: "username",
                passwordField: "password",
                session: true,
                passReqToCallback: true
            },
            async function (req, username, password, done) {
                let authResult = await auth(username, password);
                if (authResult.code === 0) {
                    return done(null, false, {
                        error: true,
                        message:
                            "Server has something wrong , please contact the administrator",
                        code: authResult.code
                    });
                }
                if (authResult.code === 2 || authResult.code === 3) {
                    return done(null, false, {
                        error: true,
                        message: "Invalid user or password",
                        code: authResult.code
                    });
                } else if (authResult.code === 4) {
                    return done(null, false, {
                        error: true,
                        message: "The user do not active",
                        code: authResult.code
                    });
                }
                let hitUser = {
                    user: authResult.user.account,
                    userType: authResult.user.usertype
                };
                return done(null, hitUser);
            }
        )
    );

    /**@type {import("passport-jwt").StrategyOptions} */
    let jwtOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: loginPlugin.jwt.secretOrKey
    };
    passport.use("jwt", new JwtStrategy(jwtOptions, async function(jwtPayload, done) {
        try {
            let userDoc = await mongoose.model("users").findOne({
                account: jwtPayload.sub
            });
            if (userDoc) {
                return done(null, {
                    user: userDoc.account,
                    userType: userDoc.usertype
                });
            }
            return done(null, false);
        } catch(e) {
            console.error(e);
            return done(e, false);
        }
    }));
};

async function auth(username, password) {
    try {
        let user = await mongoose
        .model("users")
        .findOne({
            account: username
        })
        .exec();

        if (!user) return { code: 3, status: false, user: undefined };

        if (bcrypt.compareSync(password, user.password)) {
            if (user.status === 1) { //Successful
                return {
                    code: 1,
                    user: user
                };
            }
            return { //User inactivated
                code: 4,
                user: undefined
            };
        } else { //Invalid password
            return {
                code: 2,
                user: undefined
            };
        }
    } catch(e) {
        console.error(e);
        return {
            code: 0,
            user: undefined
        };
    }
}