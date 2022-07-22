const express = require('express');
const router = express.Router();
const {validateParams , fhirValidateParams} = require('../../validator');
const joi = require('joi');

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

router.post('/' , fhirValidateParams({
    gender: joi.string().valid('male' , 'female' , 'other' , 'unknown') ,
    resourceType: joi.string().valid('Patient').required()
} , "body" ,{ allowUnknown : true }),require('./controller/post_patient'));
//update patient
router.put('/:id' , fhirValidateParams({
    gender: joi.string().valid('male', 'female', 'other', 'unknown'), resourceType: joi.string().valid('Patient').required()
} , "body" ,{ allowUnknown : true }) ,require("./controller/putPatient"));
//delete patient
router.delete('/:id',  require("./controller/delete_patient"));

module.exports = router;
