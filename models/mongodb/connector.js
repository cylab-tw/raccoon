'use strict';
/**
 * Created by Macy on 2018/09/21.
 */
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const fs = require('fs');
const path = require('path');
const basename = path.basename(module.filename);
module.exports = exports = function(config) {
  const id = config.MONGODB_USER;
  const pwd = (config.MONGODB_PASSWORD);
  const hosts = JSON.parse(config.MONGODB_HOSTS);
  const ports = JSON.parse(config.MONGODB_PORTS);
  const dbName = config.MONGODB_NAME;
  const slave = config.MONGODB_SLAVEMODE;
  const collection = {};
  let databaseUrl = "";

  hosts.forEach((host, index) => {
    if (index === 0) {
      if (id == undefined && pwd == "undefined")
      {
        databaseUrl += "mongodb://" + host + ":" + ports[0];
      }
      else
      {
        databaseUrl += "mongodb://" + id + ":" + pwd + "@" + host + ":" + ports[0];
      }
    } else {
      databaseUrl += "," + host + ":" + ports[index];
    }
  });

  databaseUrl += "/" + dbName + "?slaveOk=" + slave;

  console.log(databaseUrl);
  mongoose.connect(databaseUrl, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify :false , 
    auth:
    {
      authSource : 'admin',  
      user : id , 
      password : pwd
    }
  } , function (err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function() {
    console.log("we're connected!");
  });

  fs.readdirSync(__dirname + '/model')
    .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
    .forEach((file) => {
      const moduleName = file.split('.')[0];
      console.log('moduleName :: ', moduleName);
      console.log('path : ', __dirname + '/model')
      collection[moduleName] = require(__dirname + '/model/' + moduleName)(mongoose);
    });

  return collection;
};