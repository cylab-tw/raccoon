const mongoose = require('mongoose');
module.exports = new mongoose.Schema({
    value : {
        type : Number
    } ,
    comparator : {
        type : String
    } ,
    unit : {
        type : String
    } , 
    system : {
        type : String
    } ,
    code : {
        type : String
    }
}, {_id : false });