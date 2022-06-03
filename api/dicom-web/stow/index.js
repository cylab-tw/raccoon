const express = require('express');
const router = express.Router();

router.post("/studies" , require("./controller/postSTOW"));

router.post("/studies/:studyID" , require('./controller/postSTOW'));

module.exports = router;