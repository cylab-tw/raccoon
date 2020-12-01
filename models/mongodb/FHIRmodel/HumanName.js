
const mongoose = require('mongoose');
module.exports =  new mongoose.Schema({
    use : {
        type : String , 
        default : void 0
    } , 
    text : {
        type :String  , 
        default : void 0
    } , 
    family : {
        type : String , 
        default : void 0
    },
    given : {
        type : Array , 
        default : void 0
    } ,
    prefix : {
        type : Array , 
        default : void 0
    } ,
    suffix : {
        type : Array , 
        default : void 0
    } ,
    period : {
        type : Object , 
        default : void 0
    }
}, {_id : false });