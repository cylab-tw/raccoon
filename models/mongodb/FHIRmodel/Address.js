const mongoose = require('mongoose');
const periodSchema = require('./Period');

module.exports = new mongoose.Schema({
    use : {
        type : String
    } ,
    type : {
        type : String
    } ,
    text : {
        type : String
    } , 
    line : {
        type : [String] , 
        default : void 0
    } ,
    city : {
        type : String
    } , 
    district : {
        type : String
    } ,
    state : {
        type : String
    } , 
    postalCode : {
        type : String
    } ,
    country : {
        type : String
    } ,
    period: {
        type : periodSchema ,
        default : void 0
    }
} , {_id : false });