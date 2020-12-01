const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
    system: {
        type: String
    },
    version: {
        type: String
    },
    code: {
        type: String
    },
    display: {
        type: String
    },
    userSelected: {
        type: Boolean
    }
} , {_id : false });