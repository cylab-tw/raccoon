const mongoose = require('mongoose');
const identifierSchema = require('./Identifier');

module.exports = new mongoose.Schema ({
    reference : {
        type : String
    } ,
    type : {
        type : String
    } ,
    identifier : {
        type : identifierSchema ,
        _id : false ,
        default : void 0
    } ,
    display : {
        type : String
    }
}, {_id : false });