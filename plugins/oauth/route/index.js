const router = require("express").Router();
const { isOAuthLogin } = require("../middleware");
const { pluginsConfig } = require("../../config");
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention

const oauthPlugin = pluginsConfig.oauth;
for (let i = 0; i < oauthPlugin.routers.length; i++) {
    let middlewareRouter = oauthPlugin.routers[i];
    router[middlewareRouter.method](middlewareRouter.path, isOAuthLogin);
}

module.exports = router;