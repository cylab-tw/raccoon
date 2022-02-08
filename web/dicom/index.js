'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const {isAdminLogin , isLogin}  =require('../../api/Api_function');

function loginCallback(req, res, next) {
  if (process.env.ENABLE_LOGIN_ACCESS== "true") {
    return isLogin(req, res, next);
  } else {
    return next();
  }
}

router.get('/updicom', loginCallback, function(req, res) {
  res.sendFile('UploadDicom.html', {
    root: __dirname + '../../../public/html'
  });
});

router.get('/test', function(req, res) {
  res.sendFile('test.html', {
    root: __dirname + '../../../public/html'
  });
});

router.get('/UserManager', isAdminLogin, function(req, res) {
  res.sendFile('UserManager.html', {
    root: __dirname + '../../../public/html'
  });
});

router.get('/imageMS', loginCallback, function (req ,res) {
  res.sendFile('ImageMS.html' , {
    root : __dirname + '../../../public/html'
  });
});

router.get('/reportContent'  , function (req ,res) {
  res.sendFile('reportContent.html' , {
    root : __dirname + '../../../public/html'
  });
});

router.get('/dicomToJpegTask', loginCallback , function(req, res) {
  res.sendFile('dicomToJpegTask.html' , {
    root: __dirname + '../../../public/html'
  });
});


module.exports = router;