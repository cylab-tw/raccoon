const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

module.exports.checkExist = async function (filename) {
    return new Promise ((resolve)=> {
        /*fs.exists(filename , function (isExist) {
            return resolve(isExist);
        })*/
        return resolve(fs.existsSync(filename));
    });
};
module.exports.mkdir_Not_Exist =async function (filename)
{
    return new Promise(async (resolve)=>
    {
        let newPath = path.dirname(filename);
        let isExist = await exports.checkExist(newPath);
        if (!isExist) {
            mkdirp (newPath , 0o775, async function (err) {
                if (err) {
                    console.error(err);
                    return resolve(false);
                }
                return resolve(true);
            });
        } else {
            return resolve(true);
        }
    });
};