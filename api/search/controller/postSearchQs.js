
module.exports = async function (req, res) {
    //console.log(req.body);
    req.session.storeSearchQs = req.body;
    res.end();
}