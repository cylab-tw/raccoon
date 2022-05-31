'use strict';
/**
 * Created by Macy on 2018/09/21.
 */
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const fs = require('fs');
const path = require('path');
const basename = path.basename(module.filename);
module.exports = exports = function (config) {
    const id = config.MONGODB_USER;
    const pwd = (config.MONGODB_PASSWORD);
    const hosts = JSON.parse(config.MONGODB_HOSTS);
    const ports = JSON.parse(config.MONGODB_PORTS);
    const dbName = config.MONGODB_NAME;
    const slave = config.MONGODB_SLAVEMODE;
    const collection = {};
    let databaseUrl = "";

    hosts.forEach((host, index) => {
        if (index == 0) {
            databaseUrl += `mongodb://${host}:${ports[0]}`;
        } else {
            databaseUrl += `,${host}:${ports[index]}`;
        }
    });
    databaseUrl += `/${dbName}`;

    console.log(databaseUrl);
    mongoose.connect(databaseUrl, {
        // The following parameters are no longer supported by mongoose 6.x

        // useCreateIndex: true,
        // useNewUrlParser: true,
        // useFindAndModify: false,
        // useUnifiedTopology: true,
        authSource: 'admin',
        auth:
        {
            authSource: 'admin',
            username: id,
            password: pwd
        }
    }).then(() => {
        if (process.env.MONGODB_IS_SHARDING_MODE == "true") {
            mongoose.connection.db.admin().command({
                enableSharding: dbName
            })
            .then(res => {
                console.log(`sharding database ${dbName} successfully`);
                shardCollection('/model');
            })
            .catch(err => {
                console.error(err);
            });
        }
        
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("we're connected!");
    });

    getCollections('/model', collection);

    return collection;
};

function getCollections(dirname, collectionObj) {
    let jsFilesInDir = fs.readdirSync(__dirname + dirname)
        .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'));
    for (let file of jsFilesInDir) {
        const moduleName = file.split('.')[0];
        console.log('moduleName :: ', moduleName);
        console.log('path : ', __dirname + dirname);
        collectionObj[moduleName] = require(__dirname + dirname + '/' + moduleName)(mongoose);
    }
}

function shardCollection(dirname) {
    let jsFilesInDir = fs.readdirSync(__dirname + dirname)
        .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'));
    for (let file of jsFilesInDir) {
        const moduleName = file.split('.')[0];
        if (process.env.MONGODB_IS_SHARDING_MODE == "true") {
            mongoose.connection.db.admin().command({
                shardCollection: `${process.env.MONGODB_NAME}.${moduleName}`,
                key: { id: "hashed" }
            })
                .then(res => {
                    console.log(`sharding collection ${moduleName} successfully`);
                })
                .catch(err => {
                    console.error(err);
                });
        }
    }
}