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
        routers: [
            {
                path: "/dicom-web/studies/:studyID",
                method: "get"
            }
        ],
        http: "https", // http | https
        host: "oauth.dicom.tw", //The oauth server hostname
        clientId: "account", //The oauth client ID
        path: "/realms/Cylab/protocol/openid-connect/userinfo", //oauth verify token path, usually "/realms/{your realm}}/protocol/openid-connect/userinfo"
        authPath: "/realms/Cylab/protocol/openid-connect/auth", //oauth login path, usually "/realms/{your realm}}/protocol/openid-connect/auth"
        tokenPath: "/realms/Cylab/protocol/openid-connect/token", //oauth-client request token path, usually "/realms/{your realm}}/protocol/openid-connect/token"
        port: ""
    },
    ckan: {
        name: "ckan",
        enable: true,
        before: true,
        routers: [
            {
                path: "/dicom-web/studies/:studyID",
                method: "get"
            }
        ],
        http: "https", // http | https
        host: "ckan.dicom.tw", //The ckan server hostname
        userListPath:"/api/3/action/user_list", // ckan api url for getting user list , usually "/api/3/action/user_list"
        collaboratorPath:"/api/3/action/package_collaborator_list", // ckan api url for getting user's package collaborator list usually "/api/3/action/package_collaborator_list_for_user"
        ckanToken:"", // ckan token for getting user list and package collaborator list.
        port: ""
    }
};
