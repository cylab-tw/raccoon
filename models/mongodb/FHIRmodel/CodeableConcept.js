const mongoose = require('mongoose');
const codingSchema = require('./Coding');


module.exports = new mongoose.Schema({
    coding : {
        type : [codingSchema] , 
        default : void 0
    } , 
    text : {
        type : String
    }
}, {_id : false });