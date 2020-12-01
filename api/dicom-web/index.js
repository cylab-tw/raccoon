'use strict';
const express = require('express');
const router = express.Router();
const {isLogin} = require('../Api_function');

//router.use(isLogin);

router.get('/studies/:studyID' ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID' ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID' , require('./controller/wado-rs'));

router.get('/studies/:studyID/metadata' , require('./controller/metadata'));
router.get('/studies/:studyID/series/:seriesID/metadata' , require('./controller/metadata'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/metadata' , require('./controller/metadata'));


router.get('/studies' , require('./controller/qido-rs'));
router.get('/studies/:studyID/series' , require('./controller/qido-rs'));
router.get('/studies/:studyID/series/:seriesID/instances' , require('./controller/qido-rs'));


router.get('/instances' , require('./controller/qido-rs-instance'));
router.get('/studies/:studyID/instances' , require('./controller/qido-rs-study-instance'));
router.get('/series' , require('./controller/qido-rs-series'));

module.exports = router;