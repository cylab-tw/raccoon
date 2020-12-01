const express = require('express');
const router = express.Router();
const path = require('path');
const {isLogin}  = require('../../api/Api_function');

router.get('/', function (req, res) {
    res.sendFile('index.html', {
        root: __dirname + '../../../public/html'
    });
});

module.exports = router;