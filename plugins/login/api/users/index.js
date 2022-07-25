
const express = require('express');
const router = express.Router();
const {validateParams} = require('../../../../api/validator');
const joi = require('joi');
const { isLogin, isAdmin } = require("../../middleware");

router.post('/', validateParams({
    acc : joi.string().alphanum().min(3).max(100).required() ,
    pwd : joi.string().regex(/^(?=.*\d)(?=.*[a-z]).{8,30}$/).required(), 
    fname : joi.string().required() , 
    lname : joi.string().required() , 
    gender : joi.string().valid("male" , "female" , "other" , "unknown").required() ,
    status : joi.number().integer().min(0).max(1) , 
    usertype : joi.string()
} , "query" , {allowUnknown  : false}),require('./controller/post_user'));

router.put('/:_id', isLogin, validateParams({
    usertype : joi.string() , 
    status : joi.number().integer().min(0).max(1) ,
    password : joi.string().regex(/^(?=.*\d)(?=.*[a-z]).{8,30}$/), 
    email : joi.string().email() , 
    firstname : joi.string() , 
    lastname : joi.string(), 
    gender : joi.string().valid("male" , "female" , "other" , "unknown")
} , "body"),require('./controller/put_user'));

router.get("/", isLogin, isAdmin, require("./controller/get_user"));

router.delete("/:_id", isLogin, isAdmin, require("./controller/delete_user"));

module.exports = router;