const express = require('express');
const router = express.Router();
const {isLogin} = require('../Api_function');

//router.use(isLogin);

router.post("/upload" , require("./contoller/uploadXml"));

router.get("/xml2dcm/:filename" , require("./contoller/getDCM.js"));

module.exports = router;