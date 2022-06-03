module.exports.pluginsConfig = [
    {
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
        }
    }
];