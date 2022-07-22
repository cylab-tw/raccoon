
const express = require('express');
const router = express.Router();
const {validateParams} = require('../../validator');

router.use((req, res, next) => {
    res.set('Content-Type', 'application/fhir+json');
    next();
});

router.get('/' , require('./controller/getMetadata'));

module.exports = router;