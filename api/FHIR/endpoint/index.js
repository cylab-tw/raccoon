const express = require('express');
const router = express.Router();
const {validateParams} = require('../../validator');
const joi  = require('joi');
const { isLogin } = require('../../Api_function');

if (process.env.ENABLE_LOGIN_ACCESS=="true") router.use(isLogin);

router.use((req, res, next) => {
    res.set('Content-Type', 'application/fhir+json');
    next();
});

router.get('/' , validateParams({
    _count : joi.number().integer() ,
    _offset : joi.number().integer()
} ,"query" , {allowUnknown : true}) , require('./controller/getEndpoint'));

router.get('/:id' , require('./controller/getEndpointById'));

router.post('/' , require('./controller/postEndpoint'));

router.put('/:id' , require('./controller/putEndpoint'));

router.delete('/:id'  ,require('./controller/deleteEndpoint'));

module.exports = router;