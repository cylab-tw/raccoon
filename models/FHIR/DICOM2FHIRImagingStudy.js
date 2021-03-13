const fs = require('fs');
const dicomParser = require('dicom-parser');
const Moment = require('moment');
const path = require('path');
const Fhir = require('fhir').Fhir;
const _ = require('lodash');
const fileFunc = require('../file/file_Func');


let ImagingStudy_List = [];
class ToJsonParent {
    constructor() {

    }
    ToJson() {
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
class ImagingStudy_Series extends ToJsonParent {
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
class ImagingStudy_Series_Instance extends ToJsonParent {
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
        this.period = new period();
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
class period {
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
}
async function Func_DicomParser(filename) {
    return new Promise(async (resolve) => {
        try {
            let dataset = dicomParser.parseDicom(filename);
            var studyobj = new ImagingStudy();
            let studyInstanceUID = dataset.string('x0020000d');
            var ANandIssuer = await Get_TwoTag(dataset, 'x00080050', 'x00080051');
            studyobj.id = studyInstanceUID;
            var identifiers = [studyInstanceUID, ANandIssuer, dataset.string('x00200010')];
            studyobj.identifier = await Get_ImagingStudy_identifiers(identifiers);
            studyobj.modality = dataset.string('x00080061');
            for (var key in dataset.elements) {
                if (key.indexOf('x0010')) {
                    studyobj.subject.reference = "Patient/" + dataset.string('x00100020');
                    studyobj.subject.type = "Patient";
                    studyobj.subject.identifier.use = "usual"
                    studyobj.subject.identifier.value = dataset.string('x00100020');
                    break;
                }
            }

            var imaging_started = dataset.string('x00080020') + dataset.string('x00080030');
            const date = Moment(imaging_started, "YYYYMMDDhhmmss").toISOString();
            studyobj.started = date;
            studyobj.numberOfSeries = dataset.string('x00201206');
            studyobj.numberOfInstances = dataset.string('x00201208');
            studyobj.description = dataset.string('x00081030');
            var study_series_obj = new ImagingStudy_Series();
            study_series_obj.uid = dataset.string('x0020000e');
            study_series_obj.number = dataset.intString('x00200011');
            study_series_obj.modality.code = dataset.string('x00080060');
            study_series_obj.description = dataset.string('x0008103e');
            study_series_obj.numberOfInstances = dataset.intString('x00201209');
            study_series_obj.bodySite.display = dataset.string('x00180015');
            var series_started = dataset.string('x00080021') + dataset.string('x00080031');
            const series_date = Moment(series_started, "YYYYMMDDhhmmss").toDate();
            study_series_obj.started = series_date != null ? series_date : undefined;
            study_series_obj.performer = dataset.string('x00081050') || dataset.string('x00081052') || dataset.string('x00081070') || dataset.string('x00081072');
            var study_series_insatance_obj = new ImagingStudy_Series_Instance();
            study_series_insatance_obj.uid = dataset.string('x00080018');
            study_series_insatance_obj.sopClass.system = "urn:ietf:rfc:3986"
            study_series_insatance_obj.sopClass.code = "urn:oid:" + dataset.string('x00080016');
            study_series_insatance_obj.number = dataset.intString('x00200013');
            study_series_insatance_obj.title = dataset.string('x00080008') || dataset.string('x00070080') || ((dataset.string('x0040a043') != undefined) ? dataset.string('x0040a043') + dataset.string('x00080104') : undefined) || dataset.string('x00420010');
            let imagingStudyJson = await CombineImagingStudyClass(studyobj, study_series_obj, study_series_insatance_obj);
            resolve(imagingStudyJson);
        }
        catch (ex) {
            console.log(ex);
            resolve(false);
        }
    });
}

async function Get_TwoTag(dataset, I_Tag1, I_Tag2) {
    return new Promise((resolve) => {
        var str1 = dataset.string(I_Tag1);
        var str2 = dataset.string(I_Tag2);
        var result = "";
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


function DCMstring(json, tag) {
    let data = _.get(json, tag);
    //console.log("d" , data);
    let value = _.get(data, "Value.0");
    return value;
}
module.exports.DCMstring = DCMstring;
async function getFHIRUseJson(json) {
    return new Promise(async (resolve) => {
        try {
            var studyobj = new ImagingStudy();
            let studyInstanceUID = DCMstring(json , '0020000D');
            var ANandIssuer = await getTwoTag(json, '00080050', '00080051');
            studyobj.id = studyInstanceUID;
            var identifiers = [studyInstanceUID, ANandIssuer, DCMstring(json,'00200010')];
            studyobj.identifier = await Get_ImagingStudy_identifiers(identifiers);
            studyobj.modality = DCMstring(json , '00080061');
            for (let key in json) {
                if (key.indexOf('0010') == 0) {
                    studyobj.subject.reference = "Patient/" + DCMstring(json , '00100020');
                    studyobj.subject.type = "Patient";
                    studyobj.subject.identifier.use = "usual"
                    studyobj.subject.identifier.value = DCMstring(json , '00100020');
                    break;
                }
            }

            var imaging_started = DCMstring(json , '00080020') + DCMstring(json , '00080030');
            const date = Moment(imaging_started, "YYYYMMDDhhmmss").toISOString();
            studyobj.started = date;
            studyobj.numberOfSeries = DCMstring (json , '00201206');
            studyobj.numberOfInstances = DCMstring( json ,'00201208');
            studyobj.description = DCMstring( json ,'00081030');
            var study_series_obj = new ImagingStudy_Series();
            study_series_obj.uid = DCMstring( json ,'0020000E');
            study_series_obj.number = DCMstring(json , '00200011');
            study_series_obj.modality.code = DCMstring( json ,'x00080060');
            study_series_obj.description = DCMstring( json ,'0008103E');
            study_series_obj.numberOfInstances = DCMstring(json , '00201209');
            study_series_obj.bodySite.display = DCMstring( json ,'00180015');
            var series_started = DCMstring( json ,'00080021') + DCMstring( json ,'00080031');
            const series_date = Moment(series_started, "YYYYMMDDhhmmss").toDate();
            study_series_obj.started = series_date != null ? series_date : undefined;
            study_series_obj.performer = DCMstring( json ,'00081050') || DCMstring( json ,'00081052') || DCMstring( json ,'00081070') || DCMstring( json ,'00081072');
            var study_series_insatance_obj = new ImagingStudy_Series_Instance();
            study_series_insatance_obj.uid = DCMstring( json ,'00080018');
            study_series_insatance_obj.sopClass.system = "urn:ietf:rfc:3986"
            study_series_insatance_obj.sopClass.code = "urn:oid:" + DCMstring( json ,'00080016');
            study_series_insatance_obj.number = DCMstring(json , '00200013');
            study_series_insatance_obj.title = DCMstring( json ,'00080008') || DCMstring( json ,'00070080') || ((DCMstring( json ,'0040a043') != undefined) ? DCMstring( json ,'0040a043') + DCMstring( json ,'00080104') : undefined) || DCMstring( json ,'00420010');
            let imagingStudyJson = await CombineImagingStudyClass(studyobj, study_series_obj, study_series_insatance_obj);
            resolve(imagingStudyJson);
        }
        catch (ex) {
            console.log(ex);
            resolve(false);
        }
    });
}

async function getTwoTag(dataset, I_Tag1, I_Tag2) {
    return new Promise((resolve) => {
        let str1 = DCMstring(dataset , I_Tag1);
        let str2 = DCMstring(dataset , I_Tag2);
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
async function Get_ImagingStudy_identifiers(identifiers) {
    return new Promise((resolve) => {
        var result = [];
        if (identifiers[0] != undefined) {
            var identifier1 = new Identifier();
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
            var identifier3 = new Identifier();
            identifier3.use = "secondary";
            identifier3.value = "s" + identifiers[2];
            result.push(identifier3);
        }
        return resolve(result);
    });
}

function IsEmptyObj(obj) {
    if (typeof (obj) != "object") {
        return false;
    }
    return Object.keys(obj).length === 0 && typeof (obj) == "object"
}

async function DeleteEmptyObj(obj) {
    return new Promise((resolve) => {
        Object.keys(obj).forEach(async (key) => {
            if (typeof (obj[key]) == "object") {
                await DeleteEmptyObj(obj[key]);
            }
            if (IsEmptyObj(obj[key]) || obj[key] == undefined || obj[key] == "" || obj[key] == null) {
                delete obj[key];
            }
        });
        resolve('success');
    })
}

async function CombineImagingStudyClass(ImagingStudy, ImagingStudy_Series, ImagingStudy_Series_Instance) {
    let ImagingStudy_Json = ImagingStudy.ToJson();
    let ImagingStudy_Series_Json = ImagingStudy_Series.ToJson();
    let ImagingStudy_Series_Instance_Json = ImagingStudy_Series_Instance.ToJson();
    ImagingStudy_Series_Json.instance.push(ImagingStudy_Series_Instance_Json);
    ImagingStudy_Json.series.push(ImagingStudy_Series_Json);
    await DeleteEmptyObj(ImagingStudy_Json);
    //ImagingStudy_List.push(ImagingStudy_Json);
    return ImagingStudy_Json;
}


async function Valid(item) {
    return new Promise((resolve) => {
        var fhir = new Fhir();
        var result = fhir.validate(item, { errorOnUnexcepted: true });
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
        ImagingStudy_List = null;
        ImagingStudy_List = [];
        ImagingStudy_List.length = 0;
        //取得local file 或 api 上的blob file
        dicomfile = await getFileDicomParser(dirname);
        let imagingStudyJson = await Func_DicomParser(dicomfile);
        let IsValid = await Valid(imagingStudyJson);
        if (IsValid) {
            //console.log("Is valid fhir");
            //fs.writeFileSync(path.parse(dirname).name + '.json' ,JSON.stringify(ImagingStudy_List[0]));

            await ImagingStudy_ToDate(imagingStudyJson);
            return resolve(imagingStudyJson);
        }
        else {
            console.log("This not valid fhir");
            return resolve("This not valid fhir");
        }
    });
}

module.exports.DCMJson2FHIR = async function (iData) {
    return new Promise(async (resolve) => {
        ImagingStudy_List = null;
        ImagingStudy_List = [];
        ImagingStudy_List.length = 0;
        //取得local file 或 api 上的blob file
        let imagingStudyJson = await getFHIRUseJson(iData);
        let IsValid = await Valid(imagingStudyJson);
        if (IsValid) {
            //console.log("Is valid fhir");
            //fs.writeFileSync(path.parse(dirname).name + '.json' ,JSON.stringify(ImagingStudy_List[0]));
            await ImagingStudy_ToDate(imagingStudyJson);
            return resolve(imagingStudyJson);
        }
        else {
            console.log("This not valid fhir");
            return resolve("This not valid fhir");
        }
    });
}
async function ImagingStudy_ToDate(List) {
    return new Promise((resolve) => {
        for (var i = 0; i < List.length; i++) {
            List[i].started = new Date(List[i].started);
            for (var j = 0; j < List[i].series.length; j++) {
                List[i].series[j].started = new Date(List[i].started);
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

module.exports.instanceBelongSeries = instanceBelongSeries

async function instanceBelongSeries(imagingStudies) {
    for (let i = 0; i < imagingStudies.length; i++) {
        imagingStudies[i].series = await exports.getObjectBelong(imagingStudies[i].series, "uid", "instance")
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

