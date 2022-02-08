const express = require('express');
const router = express.Router();
const {validateParams} = require('../../validator');
const joi = require('joi');
const { isLogin } = require('../../Api_function');

if (process.env.ENABLE_LOGIN_ACCESS=="true") router.use(isLogin);

router.use((req, res, next) => {
    res.set('Content-Type', 'application/fhir+json');
    next();
});

router.get('/' , validateParams({
    "_offset" : joi.number().integer() ,
    "_count" : joi.number().integer()
} , "query" ,{ allowUnknown : true}) , require('./controller/get_ImagingStudy'));

router.get('/:id' , require('./controller/get_ImagingStudyById'));

router.post('/convertFHIR/:id' , require('./controller/post_convertFHIR'));


router.post('/' , require('./controller/post_ImagingStudy'));

router.delete('/:studyID' , require('./controller/delete_ImagingStudy'));

router.delete('/:studyID/series/:seriesID' , require('./controller/delete_ImagingStudy'));

router.delete('/:studyID/series/:seriesID/instances/:instanceID' , require('./controller/delete_ImagingStudy'));

router.put('/:id' , require('./controller/putImagingStudy.js'));

module.exports = router;