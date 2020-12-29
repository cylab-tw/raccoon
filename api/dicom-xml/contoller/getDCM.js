const fs = require('fs');
module.exports = async function (req , res) {
    let filename = req.params.filename;
    try {
        let storedFilename = `${__dirname}/../upload_xml/${filename}`;
        let isFileExist = fs.existsSync(storedFilename);
        if (isFileExist) {
            let filestream = fs.createReadStream(storedFilename);
            filestream.pipe(res);
            filestream.on("close" , function () {
                fs.unlinkSync(storedFilename);
            });
        } else {
            res.status(204).send("no file");
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("server error");
    }
}