'use strict';
/**
 * Created by chinlin on 2019/11/18.
 */

module.exports = function(mongodb) {
  const usersSchema = mongodb.Schema({
    account: {
      type: String
    },
    password: {
      type: String
    },
    email :{
      type : String
    },
    firstname: { //名字
      type: String
    },
    lastname: { //姓
      type: String
    },
    gender : {
      type : String
    },
    usertype: { //帳號類型 admin,normal
      type: String
    },
    status :{
      type : Number //1:開通 0:沒開通
    } ,
    token : {
      type : String
    }
  });
  //account 為唯一值
  usersSchema.index({
    "account": 1
  }, {
    unique: true,
  });

  const users = mongodb.model('users', usersSchema);

  return users;
};