const fs = require('fs');
const dicomParser = require('dicom-parser');
const moment = require('moment');
const path = require('path');
const Fhir = require('fhir').Fhir; // eslint-disable-line @typescript-eslint/naming-convention
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
const fileFunc = require('../file/file_Func');


let imagingStudyList = [];
class ToJsonParent {
    constructor() {

    }
    toJson() {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {});
    }
}

class ImagingStudy extends ToJsonParent {
    constructor() {
        super();
        this.resourceType = "ImagingStudy";
        this.id = "";
        this.identifier = []; //0..* 
        this.status = "unknown"; //1..1 code registered | available | cancelled | entered-in-error | unknown
        this.modality = new Coding(); //0..* coding
        this.subject = new Reference(); //1..1 reference
        this.started = ""; //0..1 dateTime
        this.endpoint = new Reference(); //0..* Reference don't have this now  (This is mean where the DicomWEB server)
        this.numberOfSeries = ""; //0..1  int
        this.numberOfInstances = ""; //0..1 int
        this.description = ""; //0..1 string
        this.series = []; //0..*
    }
}
class ImagingStudySeries extends ToJsonParent {
    constructor() {
        super();
        this.uid = ""; //1..1 
        this.number = "";  //0..1 int 
        this.modality = new Coding(); //1..1 coding   //
        this.modality.system = "http://dicom.nema.org/resources/ontology/DCM";
        this.description = ""; //0..1 string
        this.numberOfInstances = ""; //0..1 int
        this.endpoint = new Reference(); //0..* Reference
        this.bodySite = new Coding(); //0..1 Coding
        this.laterality = new Coding();
        this.started = ""; //0..1 dateTime
        this.performer = []; //0..* {function (Codeable) :0..1, actor:1..1 (Reference)}
        this.instance = []; //0..* 
    }
}
class ImagingStudySeriesInstance extends ToJsonParent {
    constructor() {
        super();
        this.uid = ""; //1..1 
        this.sopClass = new Coding(); //1..1 coding
        this.number = ""; //0..1
        this.title = ""; //0..1
    }
}

class Coding {
    constructor() {
        this.system = undefined;
        this.version = undefined;
        this.code = undefined;
        this.display = undefined;
        this.userSelected = undefined;
    }
}
class Identifier {
    constructor() {
        this.use = undefined;
        this.type = new CodeableConcept();
        this.system = undefined;
        this.value = undefined;
        this.Period = new Period();
    }
}
class Reference {
    constructor() {
        this.reference = undefined; //(Literal reference, Relative, internal or absolute URL)(string)
        this.type = undefined; //string
        this.identifier = new Identifier();
        this.display = undefined;
    }

}

class CodeableConcept {
    constructor() {
        this.Coding = [];
        this.text = undefined;
    }
}
class Period {
    constructor() {
        this.start = undefined;
        this.end = undefined;
    }
}
module.exports.getObjectBelong = async function (iArr, uid, element) {
    return new Promise((resolve) => {
        const arrayHashmap = iArr.reduce((obj, item) => {
            let itemWithUid = _.get(item, uid.toString());
            obj[itemWithUid] ? obj[itemWithUid][element].push(...item[element]) : (obj[itemWithUid] = { ...item });
            return obj;
        }, {});
        const mergedArray = Object.values(arrayHashmap);
        return resolve(mergedArray);
    });
};
async function funcDicomParser(filename) {
    return new Promise(async (resolve) => {
        try {
            let dataset = dicomParser.parseDicom(filename);
            let studyobj = new ImagingStudy();
            let studyInstanceUID = dataset.string('x0020000d');
            let anAndIssuer = await getTwoTagDataset(
                dataset,
                "x00080050",
                "x00080051"
            ); // Accession Number and Issuer
            studyobj.id = studyInstanceUID;
            let identifiers = [studyInstanceUID, anAndIssuer, dataset.string('x00200010')];
            studyobj.identifier = await getImagingStudyIdentifiers(identifiers);
            studyobj.modality = dataset.string('x00080061');
            let patientId = dataset.string('x00100020');
            if (patientId) {
                studyobj.subject.reference = "Patient/" + dataset.string('x00100020');
                studyobj.subject.type = "Patient";
                studyobj.subject.identifier.use = "usual";
                studyobj.subject.identifier.value = dataset.string('x00100020');
            } else {
                studyobj.subject.reference = "Patient/unknown";
                studyobj.subject.type = "Patient";
                studyobj.subject.identifier.use = "anonymous";
                studyobj.subject.identifier.value = "unknown";
            }

            let imagingStarted = dataset.string('x00080020') + dataset.string('x00080030');
            const date = moment(imagingStarted, "YYYYMMDDhhmmss").toISOString();
            studyobj.started = date;
            studyobj.numberOfSeries = dataset.string('x00201206');
            studyobj.numberOfInstances = dataset.string('x00201208');
            studyobj.description = dataset.string('x00081030');
            let studySeriesObj = new ImagingStudySeries();
            studySeriesObj.uid = dataset.string('x0020000e');
            studySeriesObj.number = dataset.intString('x00200011');
            studySeriesObj.modality.code = dataset.string('x00080060');
            studySeriesObj.description = dataset.string('x0008103e');
            studySeriesObj.numberOfInstances = dataset.intString('x00201209');
            studySeriesObj.bodySite.display = dataset.string('x00180015');
            let seriesStarted = dataset.string('x00080021') + dataset.string('x00080031');
            const seriesDate = moment(seriesStarted, "YYYYMMDDhhmmss").toDate();
            studySeriesObj.started = seriesDate != null ? seriesDate : undefined;
            studySeriesObj.performer = dataset.string('x00081050') || dataset.string('x00081052') || dataset.string('x00081070') || dataset.string('x00081072');
            let studySeriesInstanceObj = new ImagingStudySeriesInstance();
            studySeriesInstanceObj.uid = dataset.string('x00080018');
            studySeriesInstanceObj.sopClass.system = "urn:ietf:rfc:3986";
            studySeriesInstanceObj.sopClass.code = "urn:oid:" + dataset.string('x00080016');
            studySeriesInstanceObj.number = dataset.intString('x00200013');
            studySeriesInstanceObj.title = dataset.string('x00080008') || dataset.string('x00070080') || ((dataset.string('x0040a043') != undefined) ? dataset.string('x0040a043') + dataset.string('x00080104') : undefined) || dataset.string('x00420010');
            let imagingStudyJson = await combineImagingStudyClass(studyobj, studySeriesObj, studySeriesInstanceObj);
            resolve(imagingStudyJson);
        }
        catch (ex) {
            console.log(ex);
            resolve(false);
        }
    });
}

async function getTwoTagDataset(dataset, iTag1, iTag2) {
    return new Promise((resolve) => {
        let str1 = dataset.string(iTag1);
        let str2 = dataset.string(iTag2);
        let result = "";
        if (str1 != undefined && str2 != undefined) {
            result = str1 + str2;
        }
        else if (str1 != undefined) {
            result = str1;
        }
        else if (str2 != undefined) {
            result = str2;
        }
        else {
            result = undefined;
        }
        return resolve(result);
    });
}


function dcmString(json, tag) {
    let data = _.get(json, tag);
    //console.log("d" , data);
    let value = _.get(data, "Value.0");
    return value;
}
module.exports.dcmString = dcmString;
async function getFHIRUseJson(json) {
    return new Promise(async (resolve) => {
        try {
            let studyobj = new ImagingStudy();
            let studyInstanceUID = dcmString(json, '0020000D');
            let anAndIssuer = await getTwoTag(json, '00080050', '00080051');
            studyobj.id = studyInstanceUID;
            let identifiers = [studyInstanceUID, anAndIssuer, dcmString(json, '00200010')];
            studyobj.identifier = await getImagingStudyIdentifiers(identifiers);
            let patientId = dcmString(json, '00100020');
            if (patientId) {
                studyobj.subject.reference = "Patient/" + dcmString(json, '00100020');
                studyobj.subject.type = "Patient";
                studyobj.subject.identifier.use = "usual";
                studyobj.subject.identifier.value = dcmString(json, '00100020');
            } else {
                studyobj.subject.reference = "Patient/unknown";
                studyobj.subject.type = "Patient";
                studyobj.subject.identifier.use = "anonymous";
                studyobj.subject.identifier.value = "unknown";
            }

            let imagingStarted = dcmString(json, '00080020') + dcmString(json, '00080030');
            const date = moment(imagingStarted, "YYYYMMDDhhmmss").toISOString();
            studyobj.started = date;
            studyobj.numberOfSeries = dcmString(json, '00201206');
            studyobj.numberOfInstances = dcmString(json, '00201208');
            studyobj.description = dcmString(json, '00081030');
            let studySeriesObj = new ImagingStudySeries();
            studySeriesObj.uid = dcmString(json, '0020000E');
            studySeriesObj.number = dcmString(json, '00200011');
            studySeriesObj.modality.code = dcmString(json, '00080060');
            studySeriesObj.description = dcmString(json, '0008103E');
            studySeriesObj.numberOfInstances = dcmString(json, '00201209');
            studySeriesObj.bodySite.display = dcmString(json, '00180015');
            let seriesStarted = dcmString(json, '00080021') + dcmString(json, '00080031');
            const seriesDate = moment(seriesStarted, "YYYYMMDDhhmmss").toDate();
            studySeriesObj.started = seriesDate != null ? seriesDate : undefined;
            studySeriesObj.performer = dcmString(json, '00081050') || dcmString(json, '00081052') || dcmString(json, '00081070') || dcmString(json, '00081072');
            let studySeriesInstanceObj = new ImagingStudySeriesInstance();
            studySeriesInstanceObj.uid = dcmString(json, '00080018');
            studySeriesInstanceObj.sopClass.system = "urn:ietf:rfc:3986";
            studySeriesInstanceObj.sopClass.code = "urn:oid:" + dcmString(json, '00080016');
            studySeriesInstanceObj.number = dcmString(json, '00200013');
            studySeriesInstanceObj.title = dcmString(json, '00080008') || dcmString(json, '00070080') || ((dcmString(json, '0040a043') != undefined) ? dcmString(json, '0040a043') + dcmString(json, '00080104') : undefined) || dcmString(json, '00420010');
            let imagingStudyJson = await combineImagingStudyClass(studyobj, studySeriesObj, studySeriesInstanceObj);
            resolve(imagingStudyJson);
        }
        catch (ex) {
            console.log(ex);
            resolve(false);
        }
    });
}

async function getTwoTag(dataset, iTag1, iTag2) {
    return new Promise((resolve) => {
        let str1 = dcmString(dataset, iTag1);
        let str2 = dcmString(dataset, iTag2);
        let result = "";
        if (str1 != undefined && str2 != undefined) {
            result = str1 + str2;
        }
        else if (str1 != undefined) {
            result = str1;
        }
        else if (str2 != undefined) {
            result = str2;
        }
        else {
            result = undefined;
        }
        return resolve(result);
    });
}
//Common just use official
async function getImagingStudyIdentifiers(identifiers) {
    return new Promise((resolve) => {
        let result = [];
        if (identifiers[0] != undefined) {
            let identifier1 = new Identifier();
            identifier1.use = "official";
            identifier1.system = "urn:dicom:uid";
            identifier1.value = "urn:oid:" + identifiers[0];
            result.push(identifier1);
        }
        //need sample dicom with the organization
        if (identifiers[1] != undefined) {
            let identifier2 = new Identifier();
            identifier2.type = new Coding();
            identifier2.use = "usual";
            identifier2.value = identifiers[1];
            result.push(identifier2);
        }
        if (identifiers[2] != undefined) {
            let identifier3 = new Identifier();
            identifier3.use = "secondary";
            identifier3.value = "s" + identifiers[2];
            result.push(identifier3);
        }
        return resolve(result);
    });
}

function isEmptyObj(obj) {
    if (typeof (obj) != "object") {
        return false;
    }
    return Object.keys(obj).length === 0 && typeof (obj) == "object";
}

function deleteEmptyObj(obj) {
    try {
        let cloneObj = _.cloneDeep(obj);
        Object.keys(cloneObj).forEach((key) => {
            if (typeof (cloneObj[key]) == "object") {
                deleteEmptyObj(cloneObj[key]);
            }
            if (isEmptyObj(cloneObj[key]) || cloneObj[key] == undefined || cloneObj[key] == "" || cloneObj[key] == null) {
                delete obj[key];
            }
        });
    } catch (e) {
        console.error(e);
        console.log("obj", obj);
    }

    //resolve('success');
}

//http://jsfiddle.net/ryeballar/n0afoxdu/
function removeEmpty(obj) {
    if (_.isArray(obj)) {
        return _(obj)
            .filter(_.isObject)
            .map(removeEmpty)
            .reject(_.isEmpty)
            .concat(_.reject(obj, _.isObject))
            .value();
    }
    return _(obj)
        .pickBy(_.isObject)
        .mapValues(removeEmpty)
        .omitBy(_.isEmpty)
        .assign(_.pickBy(_.omitBy(obj, _.isObject) , _.identity))
        .value();
}
async function combineImagingStudyClass(iImagingStudy, iImagingStudySeries, iImagingStudySeriesInstance) {
    try {
        let imagingStudyJson = iImagingStudy.toJson();
        let imagingStudySeriesJson = iImagingStudySeries.toJson();
        let imagingStudySeriesInstanceJson =
            iImagingStudySeriesInstance.toJson();
            
        imagingStudySeriesJson.instance.push(imagingStudySeriesInstanceJson);
        imagingStudyJson.series.push(imagingStudySeriesJson);
        imagingStudyJson = removeEmpty(imagingStudyJson);
        imagingStudyJson = _.pickBy(imagingStudyJson, _.identity);
        //imagingStudyList.push(ImagingStudy_Json);
        return imagingStudyJson;
    } catch (e) {
        console.error(e);
        return false;
    }
}


async function isValidFHIR(item) {
    return new Promise((resolve) => {
        let fhir = new Fhir();
        let result = fhir.validate(item, { errorOnUnexcepted: true });
        resolve(result);
    });
}
async function getFileDicomParser(filename) {
    let isExist = await fileFunc.checkExist(filename);
    if (isExist) {
        let file = fs.readFileSync(filename);
        return file;
    }
    return filename;
}
module.exports.DCM2FHIR = async function main(dirname) {
    return new Promise(async (resolve) => {
        let dicomfile = "";
        imagingStudyList = null;
        imagingStudyList = [];
        imagingStudyList.length = 0;
        //取得local file 或 api 上的blob file
        dicomfile = await getFileDicomParser(dirname);
        let imagingStudyJson = await funcDicomParser(dicomfile);
        let isValid = await isValidFHIR(imagingStudyJson);
        if (isValid) {
            //console.log("Is valid fhir");
            //fs.writeFileSync(path.parse(dirname).name + '.json' ,JSON.stringify(imagingStudyList[0]));

            await imagingStudyToDate(imagingStudyJson);
            return resolve(imagingStudyJson);
        }
        else {
            console.log("This not valid fhir");
            return resolve("This not valid fhir");
        }
    });
};

module.exports.DCMJson2FHIR = async function (iData) {
    return new Promise(async (resolve) => {
        imagingStudyList = null;
        imagingStudyList = [];
        imagingStudyList.length = 0;
        //取得local file 或 api 上的blob file
        let imagingStudyJson = await getFHIRUseJson(iData);
        let isValid = await isValidFHIR(imagingStudyJson);
        if (isValid) {
            //console.log("Is valid fhir");
            //fs.writeFileSync(path.parse(dirname).name + '.json' ,JSON.stringify(imagingStudyList[0]));
            //console.log(imagingStudyJson)
            await imagingStudyToDate(imagingStudyJson);
            return resolve(imagingStudyJson);
        }
        else {
            console.log("This not valid fhir");
            return resolve("This not valid fhir");
        }
    });
};
async function imagingStudyToDate(list) {
    return new Promise((resolve) => {
        for (let i = 0; i < list.length; i++) {
            list[i].started = new Date(list[i].started);
            for (let j = 0; j < list[i].series.length; j++) {
                list[i].series[j].started = new Date(list[i].started);
            }
        }
        resolve(true);
    });
}

module.exports.seriesBelongImagingStudy = seriesBelongImagingStudy;
async function seriesBelongImagingStudy(imagingStudies) {
    imagingStudies = await exports.getObjectBelong(imagingStudies, "identifier[0].value", "series");
    for (let i = 0; i < imagingStudies.length; i++) {
        imagingStudies[i].series.sort(function (a, b) {
            if (a.number > b.number) return 1;
            if (b.number > a.number) return -1;
        });
    }
    return imagingStudies;
}

module.exports.instanceBelongSeries = instanceBelongSeries;

async function instanceBelongSeries(imagingStudies) {
    for (let i = 0; i < imagingStudies.length; i++) {
        imagingStudies[i].series = await exports.getObjectBelong(imagingStudies[i].series, "uid", "instance");
    }
    for (let i = 0; i < imagingStudies.length; i++) {
        for (let j = 0; j < imagingStudies.series.length; j++) {
            imagingStudies[i].series[j].instance.sort(function (a, b) {
                if (a.number > b.number) return 1;
                if (b.number > a.number) return -1;
            });
        }
    }
    return imagingStudies;
}

