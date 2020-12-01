module.exports = async function (req ,res) {
    return res.send (req.session.storeSearchQs);
}