const mongoose = require('mongoose');
const Reference = require('./Reference');
module.exports = new mongoose.Schema({
    authorReference : {
        type : Reference ,
        default : void 0
    } , 
    authorString : {
        type : String , 
        default : void 0
    } , 
    time : {
        type : Date , 
        default : void 0
    } , 
    text : {
        type : String , 
        default : void 0
    }
}, {_id : false });