const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const mongodb = require('models/mongodb'); 
const bcrypt = require('bcrypt');
const BearerStrategy =  require('passport-http-bearer').Strategy;

module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (id, done) {
        done(null, id);
    });

    passport.use('local-login', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            session: true,
            passReqToCallback: true
        },
        async function (req,username, password, done) {
            let Auth_Status = await My_Auth(username , password);
            if (Auth_Status == 3)
            {
                return done(null, false, req.flash('error' , 'Invalid user or password'));
            }
            else if (Auth_Status == 2)
            {
                return done(null, false, req.flash('error' , 'Invalid user or password'));
            }
            else if (Auth_Status[0] == 1)
            {
                req.IsAdmin = Auth_Status[1].usertype;
                return done(null, username);
            }
            else if (Auth_Status == 0)
            {
                return done(null, false, req.flash('error' , 'Server has something wrong , please contact the administrator'));  
            }
            else
            {
                return done(null, false, req.flash('error' , 'The user do not active'));  
            }
    }));
    passport.use(new BearerStrategy(
        function(token, done) {
            mongodb.users.findOne({ token: token }, function (err, user) {
              if (err) { return done(err); }
              if (!user) { return done(null, false); }
              return done(null, user.account, { scope: 'all' });
            });
          }
    ))
};
async function My_Auth(username , password)
{
    return new Promise((resolve)=>
    {
        mongodb.users.find({account:username})
        .exec((err, result) => 
        {
            if (err) 
            {
                resolve(0) ; //錯誤
            }
            else
            {
                if (result.length >0)
                {
                    if (bcrypt.compareSync(password , result[0].password) && result[0].status == 1)
                    {
                        resolve([1,result[0]]);//帳號密碼正確且開通
                    }
                    else if (bcrypt.compareSync(password , result[0].password) && result[0].status == 0)
                    {
                        resolve(4); //無開通
                    }
                    else
                    {
                        resolve(2); //密碼錯誤
                    }
                }
                else
                {
                    resolve(3); //無帳號
                }
            }
        });
    });
}