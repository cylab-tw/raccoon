'use strict';
const express = require('express');
const joi = require('joi');
const { isNumber } = require('lodash');
const router = express.Router();
const {validateParams} = require("../validator");


router.get('/wado/', validateParams({
    requestType : joi.string().required().allow('WADO') ,
    studyUID : joi.any().required() ,
    seriesUID : joi.any().required() ,
    objectUID : joi.any().required() ,
    contentType : joi.string() ,
    frameNumber : joi.number().integer().min(1),
    imageQuality: joi.number().integer().min(1).max(100),
    region: joi.string().custom( (v,helper) => {
        let [xMin , yMin ,xMax , yMax ] = v.split(",");
        if(!joi.number().min(0).max(1).validate(xMin).error && 
               !joi.number().min(0).max(1).validate(yMin).error &&
               !joi.number().min(0).max(1).validate(xMax).error &&
               !joi.number().min(0).max(1).validate(yMax).error &&
               v.split(",").length == 4
        ) {
            if (Number(xMin) > Number(xMax)) return helper.message(`invalid region parameter, xMin : ${xMin} > xMax : ${xMax}`);
            if (Number(yMin) > Number(yMax)) return helper.message(`invalid region parameter, xMin : ${yMin} > xMax : ${yMax}`);
            return v;
        }
        return helper.message("invalid region parameter, region=xmin,ymin,xmax,ymin");
    }),
    rows: joi.number().min(1),
    columns: joi.number().min(1),
    iccprofile: joi.string().default("no").valid("no", "yes", "srgb", "adobergb", "rommrgb")
} , "query" , {allowUnknown : false}),require('api/dicom/controller/wado'));

router.get('/qido/studies/' ,validateParams({
    limit : joi.number().integer() , 
    offset : joi.number().integer()
} , "query" , {allowUnknown:true}) ,  require('api/dicom/controller/qido'));

router.get('/instance/:instanceUID/bulkdata/:objKey' , require('./controller/bulkData.js'));

router.get('/dicomToJpegTask', validateParams({
    limit: joi.number().integer(),
    offset: joi.number().integer()
}, "query", { allowUnknown: true }) , require('./controller/dicomToJpegTask'));

module.exports = router;