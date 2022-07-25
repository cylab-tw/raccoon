const router = require("express").Router();
const { ckanCollaboratorCheck } = require("../middleware");
const { pluginsConfig } = require("../../config");

const ckanPlugin = pluginsConfig.ckan;
for (let i = 0; i < ckanPlugin.routers.length; i++) {
    let middlewareRouter = ckanPlugin.routers[i];
    router[middlewareRouter.method](middlewareRouter.path, ckanCollaboratorCheck);
}

module.exports = router;