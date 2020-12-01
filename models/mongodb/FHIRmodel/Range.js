const mongoose = require('mongoose');
const Quantity = require('./Quantity');



module.exports = new mongoose.Schema({
    low : {
        type : Quantity
    } , 
    high : {
        type : Quantity
    }
}, {_id : false });