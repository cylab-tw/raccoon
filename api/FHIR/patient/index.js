const express = require('express');
const router = express.Router();
const {validateParams , FHIRValidateParams} = require('../../validator');
const joi = require('joi');
const Joi = require('joi');

router.use((req, res, next) => {
    res.set('Content-Type', 'application/fhir+json');
    next();
});
//get patients list
router.get('/' , validateParams({
    "_offset" : joi.number().integer() ,
    "_count" : joi.number().integer()
} , "query" ,{ allowUnknown : true }) ,require('./controller/get_patient'));
//get patient by id
router.get('/:id', validateParams({} ,"query" , {allowUnknown: false}) ,require('./controller/get_patientById'));
//create patient

router.post('/' , FHIRValidateParams({
    gender: Joi.string().valid('male' , 'female' , 'other' , 'unknown') ,
    resourceType : Joi.string().valid('Patient').required()
} , "body" ,{ allowUnknown : true }),require('./controller/post_patient'));
//update patient
router.put('/:id' , FHIRValidateParams({
    gender: Joi.string().valid('male' , 'female' , 'other' , 'unknown') ,resourceType : Joi.string().valid('Patient').required()
} , "body" ,{ allowUnknown : true }) ,require("./controller/putPatient"));
//delete patient
router.delete('/:id',  require("./controller/delete_patient"));

module.exports = router;
