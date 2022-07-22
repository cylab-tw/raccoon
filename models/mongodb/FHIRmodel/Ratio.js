const mongoose = require('mongoose');
const Quantity = require('./Quantity'); //eslint-disable-line @typescript-eslint/naming-convention



module.exports = new mongoose.Schema({
    numerator : {
        type : Quantity
    } , 
    denominator	 : {
        type : Quantity
    }
}, {_id : false });