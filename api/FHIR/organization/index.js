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


//get organization list
router.get('/' , validateParams({
    "_offset" : joi.number().integer() ,
    "_count" : joi.number().integer()
} , "query" ,{ allowUnknown : true }) ,require('./controller/getOrganization'));

//get organization by id
router.get('/:id', validateParams({} ,"query" , {allowUnknown: false}) ,require('./controller/getOrganizationById'));

//create organization
router.post('/' , require('./controller/postOrganization'));

//update organization
router.put('/:id' , require("./controller/putOrganization"));

//delete organization
router.delete('/:id',  require("./controller/deleteOrganization"));

module.exports = router;
