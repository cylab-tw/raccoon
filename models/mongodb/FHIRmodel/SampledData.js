const mongoose = require('mongoose');
const Quantity = require('./Quantity');



module.exports = new mongoose.Schema({
    origin : {
        type : Quantity
    } , 
    period : {
        type : Number
    } ,
    facotr : {
        type : Number
    } , 
    lowerLimit : {
        type : Number
    } ,
    upperLimit : {
        type : Number
    } ,
    dimensions : {
        type : Number
    } , 
    data : {
        type : String
    }
}, {_id : false });