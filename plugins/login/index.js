const path = require("path");
const passport = require("passport");


module.exports=  function (app) {
    app.use(passport.initialize());
    app.use(passport.session());
    app.use("/", require("./route"));
    app.use("/api/users", require("./api/users"));
    require("../../models/user/passport")(passport);
};
