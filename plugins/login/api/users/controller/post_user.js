const mongodb = require('models/mongodb');
const bcrypt = require('bcrypt');

const errorHandler = (err)=>
{
    let error = 
    {
        message : 'Server has something error'
    };
    console.log(err.message);
    return error;
}

module.exports  = async (req, res) =>
{    
    try {
        let queryParameter = req.query;
        Object.keys(queryParameter).forEach(key => 
        {
            if (!queryParameter[key]) 
            {
                delete queryParameter[key];
            }
        });
        mongodb.users.findOne({account : queryParameter['acc']},async function(err  , acc)
        {
            if (err)
            {
                let message = errorHandler(err);
                console.log(message);
                return res.status(500).json(message);
            }
            else if (acc)
            {
                return res.status(500).json({message:'The user exist.'})
            }
            else
            {
                let cryptpwd = bcrypt.hashSync(queryParameter['pwd'] , 10);
                let users = new mongodb.users(
                {
                    account : queryParameter['acc'],
                    password : cryptpwd,
                    email : queryParameter['email'],
                    firstname : queryParameter['fname'],
                    lastname : queryParameter['lname'],
                    gender : queryParameter['gender'],
                    usertype : 'normal',
                    status : 0
                });
                users.save(function (err ,doc)
                {
                    console.log('users save status:' , err?'fail':'success');
                    if (err)
                    {
                        let message = errorHandler(err);
                        return res.status(500).json(message);
                    }
                    return res.status(201).json(doc);
                });
            }
        });
    } catch (e) {
        console.log(e) ;
        let message = errorHandler(e);
        return res.status(500).json(message);
    }
    
}