const mongoose = require('mongoose');
const periodSchema = require('./Period');

module.exports = new mongoose.Schema({
    system: {
        type : String
    } ,
    value : {
        type : String
    } ,
    use : {
        type : String
    } , 
    rank : {
        type : Number
    } , 
    period : {
        type : periodSchema , 
        default : void 0
    }
}, {_id : false });