const dicomParser= require("dicom-parser");
const fs = require('fs');
/*connectionType
dicom-wado-rs
dicom-qido-rs
dicom-stow-rs
dicon-wado-uri
direct-project
*/
async function DCM2Endpoint(filename)
{
    return new Promise(async (resolve)=> {
        let port = process.env.DICOMWEB_PORT || "";
        port = (port) ? `:${port}` : "";
        let dicomfile = await getFile(filename);
        let dataset = dicomParser.parseDicom(dicomfile);
        let endpoint = {
            "resourceType" : "Endpoint" ,
            "id" : dataset.string("x0020000d") ,
            "status": "active",
            connectionType : {
                system : "http://terminology.hl7.org/CodeSystem/endpoint-connection-type" , 
                code : "dicom-wado-rs"
            },
            "payloadType": [
                {
                  "text": "DICOM"
                }
            ],
            "payloadMimeType": [
                "application/dicom"
            ],
            "address": `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}`
        };
        return resolve(endpoint);
    });
}

function DCM2Endpoint_readFile(filename)
{
    let port = process.env.DICOMWEB_PORT || "";
    port = (port) ? `:${port}` : "";
    let dicomfile = fs.readFileSync(filename);
    let dataset = dicomParser.parseDicom(dicomfile);
    let endpoint = {
        "resourceType" : "Endpoint" ,
        "id" : dataset.string("x0020000d") ,
        "status": "active",
        connectionType : {
            system : "http://terminology.hl7.org/CodeSystem/endpoint-connection-type" , 
            code : "dicom-wado-rs"
        },
        "payloadType": [
            {
                "text": "DICOM"
            }
        ],
        "payloadMimeType": [
            "application/dicom"
        ],
        "address": `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}`
    };
    return endpoint;
}
function DCM2Endpoint_imagingStudy(imagingStudy)
{
    let port = process.env.DICOMWEB_PORT || "";
    port = (port) ? `:${port}` : "";
    let endpoint = {
        "resourceType" : "Endpoint" ,
        "status": "active",
        "id" : imagingStudy.identifier[0].value.substring(8) ,
        connectionType : {
            system : "http://terminology.hl7.org/CodeSystem/endpoint-connection-type" , 
            code : "dicom-wado-rs"
        },
        "payloadType": [
            {
                "text": "DICOM"
            }
        ],
        "payloadMimeType": [
            "application/dicom"
        ],
        "address": `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}`
    };
    return endpoint;
}

async function getFile (filename) {
    return new Promise((resolve)=>
    {
        if (fs.existsSync(filename)) {
            return resolve(fs.readFileSync(filename));
        } else {
            return resolve(filename);
        }
    });
}

module.exports = {
    DCM2Endpoint : DCM2Endpoint , 
    DCM2Endpoint_readFile : DCM2Endpoint_readFile ,
    DCM2Endpoint_imagingStudy : DCM2Endpoint_imagingStudy
};


