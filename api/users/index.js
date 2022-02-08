
const express = require('express');
const router = express.Router();
const {validateParams} = require('../validator');
const Joi = require('joi');
const {isAdminLogin , isAdmin} = require('../Api_function');

router.post('/', validateParams({
    acc : Joi.string().alphanum().min(3).max(100).required() ,
    pwd : Joi.string().regex(/^(?=.*\d)(?=.*[a-z]).{8,30}$/).required(), 
    fname : Joi.string().required() , 
    lname : Joi.string().required() , 
    gender : Joi.string().valid("male" , "female" , "other" , "unknown").required() ,
    status : Joi.number().integer().min(0).max(1) , 
    usertype : Joi.string()
} , "query" , {allowUnknown  : false}),require('api/users/controller/post_user'));

router.put('/:_id', validateParams({
    usertype : Joi.string() , 
    status : Joi.number().integer().min(0).max(1) ,
    password : Joi.string().regex(/^(?=.*\d)(?=.*[a-z]).{8,30}$/), 
    email : Joi.string().email() , 
    firstname : Joi.string() , 
    lastname : Joi.string(), 
    gender : Joi.string().valid("male" , "female" , "other" , "unknown")
} , "body"),require('api/users/controller/put_user'));

router.get('/', [isAdmin],require('api/users/controller/get_user'));

router.delete('/:_id', [isAdmin],require('api/users/controller/delete_user'));

module.exports = router;