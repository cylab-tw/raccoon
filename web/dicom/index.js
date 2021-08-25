'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const {isAdminLogin , isLogin}  =require('../../api/Api_function');

router.get('/updicom',function(req, res) {
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

router.get('/imageMS'  , function (req ,res) {
  res.sendFile('ImageMS.html' , {
    root : __dirname + '../../../public/html'
  });
});

router.get('/reportContent'  , function (req ,res) {
  res.sendFile('reportContent.html' , {
    root : __dirname + '../../../public/html'
  });
});

router.get('/dicomToJpegTask' , function(req, res) {
  res.sendFile('dicomToJpegTask.html' , {
    root: __dirname + '../../../public/html'
  });
});


module.exports = router;
function isLoggedIn(req, res, next) {
  
  if (req.isAuthenticated()) {
      console.log(req.user + " Is LoggedIn");
      return next();
  }
  res.status(401);
  res.render(path.join(__dirname + "../../../public/html" , "notlogin.html"));
  return res.end();
}