var envConfig = {
    QIDO: {
        hostName: "127.0.0.1",
        port: "9090",
        api: "dicom-web",
        http: "http"
    },
    WADO: {
        hostName: "127.0.0.1",
        port: "9090",
        api: "dicom-web",
        http: "http"
    },
    FHIR: {
        hostName: "127.0.0.1",
        port: "9090",
        api: "api/fhir",
        http: "http"
    },
    /**
     * *If true, get token from localStorage and add headers for every requests
     */
    jwt: false,
    backend: {
        baseUrl: "http://localhost:8081"
    }
};