'use strict';
const express = require('express');
const Joi = require('joi');
const { isNumber } = require('lodash');
const router = express.Router();
const {validateParams} = require("../validator");
const {isLogin,isOAuthLogin} = require('../Api_function');


router.get('/wado/' ,isOAuthLogin, validateParams({
    requestType : Joi.string().required().allow('WADO') ,
    studyUID : Joi.any().required() ,
    seriesUID : Joi.any().required() ,
    objectUID : Joi.any().required() ,
    contentType : Joi.string() ,
    frameNumber : Joi.number().integer().min(1),
    imageQuality: Joi.number().integer().min(1).max(100),
    region: Joi.string().custom( (v,helper) => {
        let [xMin , yMin ,xMax , yMax ] = v.split(",");
        if(!Joi.number().min(0).max(1).validate(xMin).error && 
               !Joi.number().min(0).max(1).validate(yMin).error &&
               !Joi.number().min(0).max(1).validate(xMax).error &&
               !Joi.number().min(0).max(1).validate(yMax).error &&
               v.split(",").length == 4
        ) {
            if (Number(xMin) > Number(xMax)) return helper.message(`invalid region parameter, xMin : ${xMin} > xMax : ${xMax}`);
            if (Number(yMin) > Number(yMax)) return helper.message(`invalid region parameter, xMin : ${yMin} > xMax : ${yMax}`);
            return v;
        }
        return helper.message("invalid region parameter, region=xmin,ymin,xmax,ymin");
    }),
    rows: Joi.number().min(1),
    columns: Joi.number().min(1),
    iccprofile: Joi.string().default("no").valid("no", "yes", "srgb", "adobergb", "rommrgb")
} , "query" , {allowUnknown : false}),require('api/dicom/controller/wado'));

router.get('/qido/studies/' ,validateParams({
    limit : Joi.number().integer() , 
    offset : Joi.number().integer()
} , "query" , {allowUnknown:true}) ,  require('api/dicom/controller/qido'));

router.get('/instance/:instanceUID/bulkdata/:objKey' , require('./controller/bulkData.js'));

router.get('/dicomToJpegTask', validateParams({
    limit: Joi.number().integer(),
    offset: Joi.number().integer()
}, "query", { allowUnknown: true }) , require('./controller/dicomToJpegTask'))

module.exports = router;