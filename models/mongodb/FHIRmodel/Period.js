const mongoose = require('mongoose');

module.exports = new mongoose.Schema ({
    start : {
        type : Date
    } , 
    end : {
        type : Date
    }
}, {_id : false });