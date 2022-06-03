'use strict';

const express = require('express');
const router = express.Router();
const _ = require("lodash");
const { pluginsConfig } = require("../../plugins/config");
const loginPlugin = pluginsConfig.find((v) => v.name === "login");

router.get('/updicom', function(req, res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/UploadDicom.html", {
      user: user,
      isAdmin: userType,
      loginEnable: loginPlugin.enable
  });
});

router.get('/imageMS', function (req ,res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/ImageMS.html", {
      user: user,
      isAdmin: userType,
      loginEnable: loginPlugin.enable
  });
});

router.get('/dicomToJpegTask', function(req, res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/dicomToJpegTask.html", {
      user: user,
      isAdmin: userType,
      loginEnable: loginPlugin.enable
  });
});


module.exports = router;