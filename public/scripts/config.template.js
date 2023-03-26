var envConfig = {
    QIDO: {
        hostName: "127.0.0.1",
        port: "8081",
        api: "dicom-web",
        http: "http"
    },
    WADO: {
        hostName: "127.0.0.1",
        port: "8081",
        api: "dicom-web",
        http: "http"
    },
    FHIR: {
        hostName: "127.0.0.1",
        port: "8081",
        api: "api/fhir",
        http: "http"
    },
    login: {
        enable: false,
        jwt: false //*If true, get token from localStorage and add headers for every requests
    },
    backend: {
        baseUrl: "http://localhost:8081"
    }
};