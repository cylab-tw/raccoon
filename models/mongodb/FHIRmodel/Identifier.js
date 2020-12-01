const mongoose = require('mongoose');
const codingSchema = require('./Coding');
const periodSchema = require('./Period');

module.exports =  new mongoose.Schema({
    use: {
        type: String
    },
    type: {
        coding: {
            type : [codingSchema] , 
            default : void 0
        },
        text: {
            type: String
        }
    },
    system: {
        type: String
    },
    value: {
        type: String
    },
    peroid: {
        type : periodSchema , 
        default : void 0
    }
}, {_id : false });