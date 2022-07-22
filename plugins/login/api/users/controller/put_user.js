'use strict';
const mongodb = require('models/mongodb');
const bcrypt = require('bcrypt');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention

const errorHandler = (err) => {
  let error = {
    message: 'Server has something error'
  };
  console.log(err.message);
  if (err.message.indexOf('ObjectId failed') > 0) {
    error.message = "Update failure, your item cannot found !";
  }
  return error;
};
module.exports = async(req, res) => {
  const requestBody = req.body;
  const queryParameter = Object.keys(requestBody)
    .filter(key => (key !== '_id'))
    .reduce((obj, key) => {
      obj[key] = requestBody[key];
      return obj;
    }, {});
  const _id = req.params._id;
  try {
    let username = _.get(req, "user.user");
    let user = await mongodb.users.findOne({ account: username });

    let updateUserType = _.get(queryParameter, "usertype");
    let updateStatus = _.get(queryParameter, "status");
    if (updateUserType || typeof updateStatus === "number") {
        if (user.usertype.toUpperCase() != "ADMIN") {
            return res.status(400).send("Not Allow");
        }
    }
    if (queryParameter.password) {
      queryParameter.password = bcrypt.hashSync(queryParameter.password , 10);
    }
    if (_id) {
      mongodb.users.findByIdAndUpdate(_id, {
        $set: queryParameter
      }, {
        new: true,
        rawResult: true
      }, (err, doc) => {
        if (err) {
          let message = errorHandler(err);
          return res.status(500).json(message);
        }
        return res.status(200).json(doc.value);
      });
    }
  } catch(e) {
    let message = errorHandler(e);
    return res.status(500).json(message);
  }
};