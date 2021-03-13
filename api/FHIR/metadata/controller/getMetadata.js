
const fhirUrl = "http://hl7.org/fhir/R4";

module.exports = async function (req ,res) {
    const metaData = {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": Date.now().toString(),
        "publisher": "Not provided",
        "kind": "instance",
        "software": {
          "name": "raccoon FHIR Server",
          "version": "1.0.0"
        },
        "implementation": {
          "description": "raccoon FHIR R4 Server",
          "url": "https://fhir.dicom.tw/fhir/"
        },
        "fhirVersion": "4.0.1",
        "format": [ "json" ],
        "rest" : [
            {
                "mode" : "server" , 
                "resource" : [
                    {
                        "type" : "Patient" , 
                        "profile" : `${fhirUrl}/patient.html` ,
                        "interaction" : [
                            {
                                "code" : "read"
                            } , 
                            {
                                "code" : "update"
                            } , 
                            {
                                "code" : "delete"
                            } , 
                            {
                                'code' : "create"
                            }
                        ] , 
                        "updateCreate" : true , 
                        "conditionalDelete" : "single" ,
                        "searchInclude" : [] ,
                        "searchRevInclude" : [] ,
                        "searchParam" : [
                            {
                                "name" : "_id" , 
                                "type" : "string"
                            } ,
                            {
                                "name" : "acive" ,
                                "type" : "token"
                            } ,
                            {
                                "name" : "address" , 
                                "type" : "string"
                            } ,
                            {
                                "name" : "birthdate" , 
                                "type" : "string"
                            } ,
                            {
                                "name" : "email" , 
                                "type" : "token"
                            },
                            {
                                "name" : "family" ,
                                "type" : "string"
                            } ,
                            {
                                "name": "gender",
                                "type": "token"
                            } ,
                            {
                                "name" : "given" ,
                                "type" : "string"
                            } ,
                            {
                                "name" : "name" , 
                                "type" : "string"
                            }
                        ]
                    } ,
                    {
                        "type" : "Organization" , 
                        "profile" : `${fhirUrl}/organization.html` ,
                        "interaction" : [
                            {
                                "code" : "read"
                            } , 
                            {
                                "code" : "update"
                            } , 
                            {
                                "code" : "delete"
                            } , 
                            {
                                'code' : "create"
                            }
                        ] , 
                        "updateCreate" : true , 
                        "conditionalDelete" : "single" ,
                        "searchInclude" : [] ,
                        "searchRevInclude" : [] ,
                        "searchParam" : [
                            {
                                "name" : "_id" , 
                                "type" : "string"
                            } 
                        ]
                    }  ,
                    {
                        "type" : "ImagingStudy" , 
                        "profile" : `${fhirUrl}/imagingstudy.html` ,
                        "interaction" : [
                            {
                                "code" : "read"
                            } , 
                            {
                                "code" : "update"
                            } , 
                            {
                                "code" : "delete"
                            } , 
                            {
                                'code' : "create"
                            }
                        ] , 
                        "updateCreate" : true , 
                        "conditionalDelete" : "single" ,
                        "searchInclude" : [] ,
                        "searchRevInclude" : [] ,
                        "searchParam" : [
                            {
                                "name" : "_id" , 
                                "type" : "string"
                            } 
                        ]
                    }
                ] 
            }
        ]
    };
    res.json(metaData);
}