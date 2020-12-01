const express = require('express');
const router = express.Router();
const {isLogin} = require('../../Api_function');

//router.use(isLogin);

router.post("/studies" , require("./controller/postSTOW"));

router.post("/studies/:studyID" , require('./controller/postSTOW'));

module.exports = router;