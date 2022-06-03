const mongodb = require('models/mongodb');

module.exports = async function (req, res)
{
  const _id = req.params._id;
  try {
    let user = await mongodb.users.findOne({account : req.user});
    if (user.usertype.toUpperCase() != "ADMIN") {
      return res.status(400).send("Not Allow");
    }
    mongodb.users.deleteOne({_id:_id})
    .exec((err , result)=>
    {
      if (err) 
      {
        console.log("api /api/user has error , " , err);
        return res.status(500).json({message : "server has error"});
      }else{
        return res.status(200).json(result);
      }
    });
  } catch (e) {
    return res.status(500).json(e.message);
  }
}