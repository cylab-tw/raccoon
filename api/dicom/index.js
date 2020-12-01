'use strict';
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const {validateParams} = require("../validator");


router.get('/wado/' , require('api/dicom/controller/wado'));
router.get('/qido/studies/' ,validateParams({
    limit : Joi.number().integer() , 
    offset : Joi.number().integer()
} , "query" , {allowUnknown:true}) ,  require('api/dicom/controller/qido'));

module.exports = router;