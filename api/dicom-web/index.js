'use strict';
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { validateParams } = require('../validator');
const _ = require('lodash');


//#region wado-rs
router.get('/studies/:studyID' ,isOAuthLogin ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID' ,isOAuthLogin ,require('./controller/wado-rs'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID' ,isOAuthLogin ,require('./controller/wado-rs'));
//#endregion

//#region wado-rs-bulkdata
router.get('/studies/:studyUID/series/:seriesUID/instances/:instanceUID/bulkdata/:objKey' ,isOAuthLogin ,require('./controller/wado-rs-instances-bulkdata'));

//#endregion

//#region frameNumber
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/frames/:frameList' ,isOAuthLogin ,require('./controller/wado-rs-framenumber'));

router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/frames/:frameNumber/rendered' ,validateParams({
    frameNumber : Joi.number().integer().min(1)
} , "params" , {allowUnknown : true}), validateParams({
    quality: Joi.number().integer().min(1).max(100),
    iccprofile: Joi.string().default("no").valid("no", "yes", "srgb", "adobergb", "rommrgb"),
    viewport: Joi.string().custom((v, helper) => {
        let valueSplit = v.split(",");
        if (valueSplit.length == 2) {
            let [vw, vh] = valueSplit;
            if (!Joi.number().min(0).validate(vw).error &&
                !Joi.number().min(0).validate(vh).error) {
                return v;
            }
            return helper.message(`invalid viewport parameter, viewport=vw,vh. The vw and vh must be number`);
        } else if (valueSplit.length == 6) {
            let [vw, vh, sx, sy, sw, sh] = valueSplit;
            if (Joi.number().empty("").validate(sx).error) {
                return helper.message("invalid viewport parameter, sx must be number");
            } else if (Joi.number().empty("").validate(sy).error) {
                return helper.message("invalid viewport parameter, sy must be number");
            }
            [vw, vh, sx, sy, sw, sh] = valueSplit.map(v=> Number(v));
            if (!Joi.number().min(0).validate(vw).error &&
                !Joi.number().min(0).validate(vh).error &&
                !Joi.number().min(0).validate(sx).error &&
                !Joi.number().min(0).validate(sy).error &&
                !Joi.number().validate(sw).error &&
                !Joi.number().validate(sh).error
            ) {
                return v;
            }
        } 
        return helper.message("invalid viewport parameter, viewport=vw,vh or viewport=vw,vh,sx,sy,sw,sh");
    }),
}, "query", { allowUnknown: false }) ,isOAuthLogin  , require('./controller/wado-rs-framenumber-rendered'));
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

//#region bulk data

router.get('/studies/:studyID/bulkdata', require('./controller/bulkdata'));
router.get('/studies/:studyID/series/:seriesID/bulkdata', require('./controller/bulkdata'));
router.get('/studies/:studyID/series/:seriesID/instances/:instanceID/bulkdata', require('./controller/bulkdata'));

//#endregion


module.exports = router;