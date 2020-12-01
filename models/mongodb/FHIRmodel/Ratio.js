const mongoose = require('mongoose');
const Quantity = require('./Quantity');



module.exports = new mongoose.Schema({
    numerator : {
        type : Quantity
    } , 
    denominator	 : {
        type : Quantity
    }
}, {_id : false });