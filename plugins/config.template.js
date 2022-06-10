module.exports.pluginsConfig = {
    login: {
        name: "login",
        enable: true,
        before: true,
        routers: [
            {
                path: "/dicom-web/studies",
                method: "get"
            },
            {
                path: "/dicom-web/studies/:studyID",
                method: "get"
            }
        ],
        admin: {
            username: "",
            password: ""
        },
        jwt: {
            secretOrKey: "",
            issuer: "",
            expiresIn: "1d"
        }
    },
    oauth: {
        name: "oauth",
        enable: true,
        before: true,
        routers: [],
        http: "https", // http | https
        host: "", //The oauth server hostname
        client_id: "", //The oauth client ID
        path: "", //oauth verify token path
        auth_path: "", //oauth login path
        token_path: "", //oauth-client request token path
        port: ""
    }
};
