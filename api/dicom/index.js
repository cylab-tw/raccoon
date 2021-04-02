'use strict';
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const {validateParams} = require("../validator");


router.get('/wado/' , validateParams({
    requestType : Joi.string().required().allow('WADO') ,
    studyUID : Joi.any().required() ,
    seriesUID : Joi.any().required() ,
    objectUID : Joi.any().required() ,
    contentType : Joi.string() ,
    frameNumber : Joi.number().integer().min(1)
} , "query" , {allowUnknown : true}),require('api/dicom/controller/wado'));

router.get('/qido/studies/' ,validateParams({
    limit : Joi.number().integer() , 
    offset : Joi.number().integer()
} , "query" , {allowUnknown:true}) ,  require('api/dicom/controller/qido'));

router.get('/instance/:instanceUID/bulkdata/:objKey' , require('./controller/bulkData.js'));

module.exports = router;