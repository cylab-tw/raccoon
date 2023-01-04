'use strict';
const express = require('express');
const joi = require('joi');
const { isNumber } = require('lodash');
const router = express.Router();
const {validateParams} = require("../validator");

//#region WADO-URI

/**
 * 
 * @param {string} value 
 */
function validateRegionIndividualValue(value) {
    return joi.number().min(0).max(1).validate(value).error;
}

/**
 * 
 * @param {string} v 
 * @param {joi.CustomHelpers<any>} helper 
 * @returns 
 */
function validateRegionInQuery (v, helper) {

    if (v.split(",") !== 4) {
        return helper.message("invalid region parameter, region=xmin,ymin,xmax,ymin, and every value need between 0 and 1");
    }

    let regionValues = v.split(",");
    
    let isAnyError = regionValues.some(validateRegionIndividualValue);
    if (isAnyError) {
        return helper.message("invalid region parameter, region=xmin,ymin,xmax,ymin, and every value need between 0 and 1");
    }

    let [xMin, yMin, xMax, yMax] = regionValues;

    if (Number(xMin) > Number(xMax)) {
        return helper.message(`invalid region parameter, xMin : ${xMin} > xMax : ${xMax}`);
    }

    if (Number(yMin) > Number(yMax)) {
        return helper.message(`invalid region parameter, xMin : ${yMin} > xMax : ${yMax}`);
    }

    return v;
}

function validateWadoUriQuery(req, res, next) {
    return validateParams({
        requestType : joi.string().required().allow('WADO') ,
        studyUID : joi.any().required() ,
        seriesUID : joi.any().required() ,
        objectUID : joi.any().required() ,
        contentType : joi.string() ,
        frameNumber : joi.number().integer().min(1),
        imageQuality: joi.number().integer().min(1).max(100),
        region: joi.string().custom( validateRegionInQuery),
        rows: joi.number().min(1),
        columns: joi.number().min(1),
        iccprofile: joi.string().default("no").valid("no", "yes", "srgb", "adobergb", "rommrgb")
    } , "query" , {allowUnknown : false})(req, res, next);
}

router.get('/wado/', validateWadoUriQuery, require('api/dicom/controller/wado'));

//#endregion

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