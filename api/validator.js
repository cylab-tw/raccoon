const Joi = require('joi');
const lodash = require('lodash');
const {handleError} = require('../models/FHIR/httpMessage');

/** 
 * @param {Object} paramSchema the valid scheama
 * @param {string} item body , query , param
 * @param {Object} option Joi option
*/


const validateParams = function (paramSchema , item , options) {
    return async (req, res, next) => {
        const schema = Joi.object().keys(paramSchema);
        const paramSchemaKeys = Object.keys(req[item]);
        let requestParamObj = {};
        for (let key of paramSchemaKeys){
            requestParamObj[key] = lodash.get(req[item], key);
        }
        try{
            let value = await schema.validateAsync(requestParamObj , options);
            req[item] = value;
        } catch (err) {
            return res.status(400).send({
                status: 400,
                result: err.details[0].message
            });
        }
        next();
    }
};

const FHIRValidateParams = function (paramSchema , item , options) {
    return async (req, res, next) => {
        const schema = Joi.object().keys(paramSchema);
        const paramSchemaKeys = Object.keys(req[item]);
        let requestParamObj = {};
        for (let key of paramSchemaKeys){
            requestParamObj[key] = lodash.get(req[item], key);
        }
        try{
            let value = await schema.validateAsync(requestParamObj , options);
            req[item] = value;
        } catch (err) {
            let sendErrorMessage = handleError.processing(err.details[0].message);
            return res.status(400).send(sendErrorMessage);
        }
        next();
    }
};
module.exports = {
    validateParams: validateParams ,
    FHIRValidateParams : FHIRValidateParams
};