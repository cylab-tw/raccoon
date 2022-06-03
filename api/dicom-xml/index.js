const express = require('express');
const router = express.Router();

router.post("/upload" , require("./contoller/uploadXml"));

router.get("/xml2dcm/:filename" , require("./contoller/getDCM.js"));

module.exports = router;