const path = require("path");

module.exports=  function (app) {
    app.use("/", require("./route"));
    app.use("/api/users", require("./api/users"));
}
