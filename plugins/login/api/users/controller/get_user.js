const mongodb = require('models/mongodb');
module.exports = async function (req, res)
{
  let queryParameter = req.query;
  Object.keys(queryParameter).forEach(key => {
    if (!queryParameter[key]) {
      delete queryParameter[key];
    }
  });
  const filter = {
    password : 0 , 
    __v : 0 ,
    token : 0
  };
  let _offset = parseInt(queryParameter["_offset"]) || 0;
  let _count = parseInt(queryParameter["_count"]) || 10 ;
  delete queryParameter["_count"];
  delete queryParameter["_offset"];
  let queryResultCount =await mongodb.users.countDocuments(queryParameter);
  queryParameter = {
    ...queryParameter,
    usertype: {
      $ne: "admin"
    }
  };
  mongodb.users.find(queryParameter , filter)
  .skip(_offset)
  .limit(_count)
  .exec((err , result)=>
  {
    if (err) 
    {
      console.log("api /api/users has error , " , err);
      return res.status.json({message : "server has error"});
    } else{
      const retValue = {
        result : result , 
        count : queryResultCount
      };
      return res.status(200).json(retValue);
    }
  });
};