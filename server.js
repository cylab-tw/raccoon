'use strict';

const debug = require('debug')('DICOM Server');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const compress = require('compression');
//login
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash')
const mongodb = require('./models/mongodb');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')({ session: session });
//
const os = require('os');
const { exec } = require('child_process');
require('dotenv').config();
const port = process.env.SERVER_PORT;
const app = express();

require('rootpath')();
debug('Start DICOM Server...');
app.use(compress());
app.use(flash());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json({ "strict": false }));
app.use(bodyParser.json({ "type": "application/fhir+json" }));
app.use(bodyParser.text({ "type": "text/*" }));
//app.use(bodyParser.raw({ "type" : "multipart/related" , limit: "100gb"}));
app.use((err, req, res, next) => {
  // This check makes sure this is a JSON parsing issue, but it might be
  // coming from any middleware, not just body-parser:

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    return res.status(400).json(require('./models/FHIR/httpMessage').handleError.exception(err.message)); // Bad request
  }

  next();
});
app.use(cookieParser());
//login
app.use(session({
  secret: 'micalasecret',
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  httpOnly: true
}));
app.use(passport.initialize());
app.use(passport.session());
//
//app.use(expressValidator());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept ,Authorization");
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "Content-Disposition");
  next();
});
//require('routes')(app);

//login
require('models/user/passport.js')(passport);
require("routes.js")(app, passport);
app.engine('html', require('ejs').renderFile);
//
http.createServer(app).listen(port, function () {
  console.log(`http server is listening on port:${port}`);
});

let osPlatform = os.platform().toLocaleLowerCase();
if (osPlatform.includes('linux')) {
  process.env.ENV = "linux";
} else if (osPlatform.includes('win')) {
  process.env.ENV = "windows";
}
process.env.USE_DCM2JPEG_PYTHONAPI = (process.env.USE_DCM2JPEG_PYTHONAPI=='true') ? true : false;

let condaPath = process.env.CONDA_PATH;
let condaEnvName = process.env.CONDA_GDCM_ENV_NAME;

if (process.env.USE_DCM2JPEG_PYTHONAPI) {
  if (process.env.ENV == "windows") {
    exec(`${condaPath} run -n ${condaEnvName} python DICOM2JPEGAPI.py ${process.env.DCM2JPEG_PYTHONAPI_PORT}`, {
      cwd: process.cwd()
    }, function (err, stdout, stderr) {
      if (err) {
        console.error(err);
        process.exit(1);
      } else if (stderr) {
        console.error(stderr);
        process.exit(1);
      }
    });
  } else {
    exec(`python3 DICOM2JPEGAPI.py ${process.env.DCM2JPEG_PYTHONAPI_PORT}`, {
      cwd: process.cwd()
    }, function (err, stdout, stderr) {
      if (err) {
        console.error(err);
        process.exit(1)
      } else if (stderr) {
        console.error(stderr);
      }
    });
  }
}
(()=> {
  let checkAPITimes = 0;
  let checkAPIInterval = setInterval(async ()=> {
    if (checkAPITimes >=30) {
      console.error("The dcm2jpeg python flask api set up failure");
      process.exit(1);
    }
    if (process.env.USE_DCM2JPEG_PYTHONAPI) {
      const fetch = require('node-fetch');
        try {
          let res = await fetch(`http://localhost:${process.env.DCM2JPEG_PYTHONAPI_PORT}/`)
          console.log('the dcm2jpeg python flask api ready');
          clearInterval(checkAPIInterval);
        } catch (e) {
          checkAPITimes++;
        }
    }
  } , 1000);

})();

module.exports = app;