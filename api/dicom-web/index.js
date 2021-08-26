'use strict';
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const {isLogin} = require('../Api_function');
const { validateParams } = require('../validator');

//router.use(isLogin);

//#region wado-rs
router.get('/studies/:studyID' ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID' ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID' , require('./controller/wado-rs'));
//#endregion

//#region frameNumber
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/frames/:frameList' , require('./controller/wado-rs-framenumber'));

router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/frames/:frameNumber/rendered' , validateParams({
    frameNumber : Joi.number().integer().min(1)
} , "params" , {allowUnknown : true}), validateParams({
    quality: Joi.number().integer().min(1).max(100),
    iccprofile: Joi.string().default("no").valid("no", "yes", "srgb", "adobergb", "rommrgb")
}, "query", { allowUnknown: false }) , require('./controller/wado-rs-framenumber-rendered'));
//#endregion

//#region metadata
router.get('/studies/:studyID/metadata' , require('./controller/metadata'));
router.get('/studies/:studyID/series/:seriesID/metadata' , require('./controller/metadata'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/metadata' , require('./controller/metadata'));
//#endregion

//#region qido-rs
router.get('/studies' , require('./controller/qido-rs'));
router.get('/studies/:studyID/series' , require('./controller/qido-rs'));
router.get('/studies/:studyID/series/:seriesID/instances' , require('./controller/qido-rs'));


router.get('/instances' , require('./controller/qido-rs-instance'));
router.get('/studies/:studyID/instances' , require('./controller/qido-rs-study-instance'));
router.get('/series' , require('./controller/qido-rs-series'));
//#endregion

module.exports = router;