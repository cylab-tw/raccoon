'use strict';

const express = require('express');
const router = express.Router();
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const { pluginsConfig } = require("../../plugins/config");

router.get('/updicom', function(req, res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/UploadDicom.html", {
      user: user,
      isAdmin: userType
  });
});

router.get('/imageMS', function (req ,res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/ImageMS.html", {
      user: user,
      isAdmin: userType
  });
});

router.get('/dicomToJpegTask', function(req, res) {
  let user = _.get(req, "user.user");
  let userType = _.get(req, "user.userType");
  res.render("html/dicomToJpegTask.html", {
      user: user,
      isAdmin: userType
  });
});


module.exports = router;