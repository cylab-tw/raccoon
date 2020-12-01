const fs = require('fs');
const dicomParser = require('dicom-parser');
const dateFormat = require('dateformat');
const Moment = require('moment');
const path = require('path');
const Fhir = require('fhir').Fhir;
const dicom = require('dicom');
const _ = require('lodash');
const fileFunc = require('../file/file_Func');
const {getObjectBelong} = require('api/Api_function');
const dcmtk  =require('../dcmtk');


let ImagingStudy_List = [];
class ToJsonParent
{
    constructor()
    {

    }
    ToJson()
    {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {}); 
    }
}

class ImagingStudy extends ToJsonParent
{
    constructor()
    {
        super();
        this.resourceType = "ImagingStudy";
        this.id = "";
        this.identifier = []; //0..* 
        this.status  = "unknown"; //1..1 code registered | available | cancelled | entered-in-error | unknown
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
class ImagingStudy_Series extends ToJsonParent
{
    constructor()
    {
        super();
        this.uid =""; //1..1 
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
class ImagingStudy_Series_Instance extends ToJsonParent
{
    constructor ()
    {
        super();
        this.uid = ""; //1..1 
        this.sopClass = new Coding(); //1..1 coding
        this.number = ""; //0..1
        this.title =""; //0..1
    }
}

class Coding
{
    constructor ()
    {
        this.system = undefined;
        this.version = undefined;
        this.code = undefined;
        this.display = undefined;
        this.userSelected = undefined;
    }
}
class Identifier
{
    constructor ()
    {
        this.use = undefined;
        this.type = new CodeableConcept();
        this.system = undefined;
        this.value = undefined;
        this.period = new period();
    }
}
class Reference
{
    constructor ()
    {
        this.reference = undefined; //(Literal reference, Relative, internal or absolute URL)(string)
        this.type = undefined ; //string
        this.identifier = new Identifier();
        this.display = undefined;
    }
    
}

class CodeableConcept
{
    constructor ()
    {
        this.Coding = [];
        this.text = undefined ;
    }
}
class period
{
    constructor ()
    {
        this.start  = undefined;
        this.end = undefined;
    }
}

async function Func_DicomParser (filename)
{
    return new Promise (async (resolve)=> {
        try
        {
            let dataset = dicomParser.parseDicom(filename);
            var studyobj = new ImagingStudy();
            let studyInstanceUID = dataset.string('x0020000d');
            var ANandIssuer = await Get_TwoTag(dataset , 'x00080050' , 'x00080051');
            studyobj.id = studyInstanceUID;
            var identifiers = [studyInstanceUID ,  ANandIssuer , dataset.string('x00200010')];
            studyobj.identifier = await Get_ImagingStudy_identifiers(identifiers);
            studyobj.modality = dataset.string('x00080061');
            for (var key in dataset.elements)
            {
                if (key.indexOf('x0010'))
                {
                    studyobj.subject.reference =  "Patient/" + dataset.string('x00100020');
                    studyobj.subject.type= "Patient" ; 
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
            study_series_obj.bodySite.display =dataset.string('x00180015');
            /*{
                display :dataset.string('x00180015')
            };*/
            var series_started = dataset.string('x00080021') + dataset.string('x00080031');
            const series_date = Moment(series_started ,"YYYYMMDDhhmmss").toDate();
            study_series_obj.started =  series_date !=null ? series_date : undefined;
            study_series_obj.performer = dataset.string('x00081050')||dataset.string('x00081052')||dataset.string('x00081070')||dataset.string('x00081072');
            var study_series_insatance_obj = new ImagingStudy_Series_Instance();
            study_series_insatance_obj.uid = dataset.string('x00080018');
            study_series_insatance_obj.sopClass.system = "urn:ietf:rfc:3986"
            study_series_insatance_obj.sopClass.code = "urn:oid:" + dataset.string('x00080016');
            /*{
                system : "urn:ietf:rfc:3986",
                code : "urn:oid:" + dataset.string('x00080016')
            };*/
            study_series_insatance_obj.number = dataset.intString('x00200013');
            study_series_insatance_obj.title= dataset.string('x00080008') ||dataset.string('x00070080') || ((dataset.string('x0040a043')!=undefined) ? dataset.string('x0040a043') + dataset.string('x00080104') : undefined) || dataset.string('x00420010');
            let imagingStudyJson = await CombineImagingStudyClass(studyobj , study_series_obj , study_series_insatance_obj , filename);
            resolve(imagingStudyJson);
        }
        catch (ex)
        {
            console.log(ex);
            resolve(false);
        }
    });
    
}
async function Get_TwoTag(dataset , I_Tag1 , I_Tag2)
{
    return new Promise((resolve)=>
    {
        var str1=dataset.string(I_Tag1);
        var str2 = dataset.string(I_Tag2);
        var result = "";
        if (str1 != undefined && str2!= undefined)
        {
            result = str1 + str2 ;      
        }
        else if (str1 != undefined)
        {
            result = str1;
        }
        else if (str2 != undefined)
        {
            result = str2;
        }
        else 
        {
            result = undefined;
        }
        return resolve(result);
    });
}

//Common just use official
async function Get_ImagingStudy_identifiers(identifiers)
{
    return new Promise((resolve)=>
    {
        var result = [];
        if (identifiers[0] != undefined)
        {
            var identifier1 = new Identifier(); 
            
            identifier1.use = "official";
            identifier1.system = "urn:dicom:uid";
            identifier1.value = "urn:oid:" + identifiers[0];
            result.push(identifier1);
        }
        //need sample dicom with the organization
        if (identifiers[1] != undefined)
        {
            let identifier2 = new Identifier();
            identifier2.type = new Coding();
            identifier2.use = "usual" ;
            identifier2.value = identifiers[1];
            result.push(identifier2);
        }
        if (identifiers[2] != undefined)
        {
            var identifier3 = new Identifier(); 
            identifier3.use = "secondary";
            identifier3.value = "s" + identifiers[2];
            result.push(identifier3);
        }
        return resolve(result);
    });
}

function IsEmptyObj(obj)
{
    if (typeof(obj) != "object")
    {
        return false;
    }
    return Object.keys(obj).length === 0 && typeof(obj) == "object"
}

async function DeleteEmptyObj(obj)
{
    return new Promise((resolve)=>
    {
        Object.keys(obj).forEach(async(key)=>
        {
            if (typeof(obj[key]) == "object")
            {
                await DeleteEmptyObj(obj[key]);
            }
            if (IsEmptyObj(obj[key]) || obj[key] == undefined || obj[key] == "" || obj[key] == null)
            {
                delete obj[key];
            }
        });
        resolve('success');
    })
}

async function CombineImagingStudyClass(ImagingStudy , ImagingStudy_Series , ImagingStudy_Series_Instance , filename)
{
    let ImagingStudy_Json = ImagingStudy.ToJson();
    let ImagingStudy_Series_Json = ImagingStudy_Series.ToJson();
    let ImagingStudy_Series_Instance_Json = ImagingStudy_Series_Instance.ToJson();
    ImagingStudy_Series_Json.instance.push(ImagingStudy_Series_Instance_Json);
    ImagingStudy_Json.series.push(ImagingStudy_Series_Json);
    await DeleteEmptyObj(ImagingStudy_Json);
    //ImagingStudy_List.push(ImagingStudy_Json);
    return ImagingStudy_Json;
}


async function Valid(item)
{
    return new Promise((resolve)=>
    {
        var fhir = new Fhir();
        var result = fhir.validate(item, {errorOnUnexcepted : true});
        resolve(result);
    });
}
async function getFileDicomParser (filename) {
    let isExist = await fileFunc.checkExist(filename);
    if (isExist) {
        let file = fs.readFileSync(filename);
        return file;
    }
    return filename;
}
module.exports.DCM2FHIR =  async function main(dirname)
{
    return new Promise (async (resolve)=>{
        let dicomfile = "";
        ImagingStudy_List = null;
        ImagingStudy_List = [];
        ImagingStudy_List.length = 0;
            //取得local file 或 api 上的blob file
        dicomfile = await getFileDicomParser(dirname);
        let imagingStudyJson = await Func_DicomParser(dicomfile); 
        let IsValid = await Valid(imagingStudyJson);
        if (IsValid)
        {
            //console.log("Is valid fhir");
            //fs.writeFileSync(path.parse(dirname).name + '.json' ,JSON.stringify(ImagingStudy_List[0]));
            
            await ImagingStudy_ToDate(imagingStudyJson);
            return resolve(imagingStudyJson);
        }
        else
        {
            console.log("This not valid fhir");
            return resolve("This not valid fhir");
        }
    });
    
}
module.exports.dcmtk2DicomJson = async function (filename) {
    return dcmtk.dcm2json(filename);
}
// Use dcmtk
module.exports.dicomParser2DicomJson = async function (filename) {
    function getVRDicomJson (vr , value) {
        let diccomJsonObj = {
            vr: vr , 
            Value : value
        }
        return diccomJsonObj;
    }
    function getVROBDicomJson (vr , value) {
        let diccomJsonObj = {
            vr: vr , 
            InlineBinary : value
        }
        return diccomJsonObj;
    }
    return new Promise(async (resolve , reject)=> {
        let dicomfile = await getFileDicomParser(filename);
        let dataset = dicomParser.parseDicom(dicomfile);
        //let dicomParserJson = dicomParser.explicitDataSetToJS(dataset);
        let dicomObj = {}
        for (let propertyName in dataset.elements) {
            if (propertyName === "x7FE00010") {
                //console.error(`don't have this tag:${propertyName}`);
                continue;
            } 
            let element = dataset.elements[propertyName];
            let vr = element.vr;
            let vrFunc = {
                "PN" :async (value , propertyName , newDataSet , newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    let PN = scopeDataSet.string(propertyName);
                    PN === undefined ? "" : (async () => {
                        let pname = dicomParser.parsePN(PN);
                        await DeleteEmptyObj(pname);
                        value.push(pname);
                    })();
                    return getVRDicomJson(vr , value);
                },
                "CS" : (value , propertyName , newDataSet , newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    try {
                        let str = scopeDataSet.string(propertyName);
                        if (newVR) {
                            vr = newVR;
                        }
                        strReg = str===undefined ? []:str.split(/\\/g);
                        for (let i = 0 ; i < strReg.length ; i++) {
                            value.push(strReg[i]);
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {

                    }
                } , 
                "AS" : (value , propertyName , newDataSet , newVR)  => {
                    return vrFunc.CS(value , propertyName, newDataSet , newVR);
                },
                "US" : (value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        let result = scopeDataSet.uint16(propertyName);
                        if (result){
                            value.push (result);
                            for(var i=1; i < dataset.elements[propertyName].length/2; i++) {
                                value.push(scopeDataSet.uint16(propertyName, i));
                            }
                            return getVRDicomJson(vr , value);
                        }
                    } catch (e) {

                    }
                } , 
                "UL" : (value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        value.push (scopeDataSet.uint32(propertyName));
                        for(var i=1; i < dataset.elements[propertyName].length/4; i++) {
                            value.push(scopeDataSet.uint32(propertyName, i));
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {

                    }
                } , 
                "SS" :(value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        value.push (scopeDataSet.int16(propertyName));
                        for(var i=1; i < dataset.elements[propertyName].length/2; i++) {
                            value.push(scopeDataSet.int16(propertyName, i));
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {

                    }
                } , 
                "SL" :(value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        value.push (scopeDataSet.int32(propertyName));
                        for(var i=1; i < dataset.elements[propertyName].length/4; i++) {
                            value.push(scopeDataSet.int32(propertyName, i));
                        }
                        return getVRDicomJson(vr , value);
                    } catch(e) {}
                } , 
                "FD" : (value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        value.push (scopeDataSet.double(propertyName));
                        for(var i=1; i < dataset.elements[propertyName].length/8; i++) {
                            value.push(scopeDataSet.double(propertyName, i));
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {}
                } , 
                "FL" : (value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        value.push (scopeDataSet.float(propertyName));
                        for(var i=1; i < dataset.elements[propertyName].length/4; i++) {
                            value.push(scopeDataSet.float(propertyName, i));
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {}
                } ,
                "DS" : (value , propertyName, newDataSet, newVR) => {
                    if (newVR) {
                        vr = newVR;
                    }
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    try {
                        let str = scopeDataSet.string(propertyName)||"";
                        strReg = str.split(/\\/g);
                        for (let i = 0 ; i < strReg.length ; i++) {
                            value.push(parseFloat(strReg[i]));
                        }
                        return getVRDicomJson(vr , value);
                    } catch (e) {}
                } ,
                "DA" : (value , propertyName, newDataSet, newVR) => {
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                        let str = scopeDataSet.string(propertyName);
                        str = str===undefined ? "" : value.push(str);
                        
                        return getVRDicomJson(vr , value);
                    } catch (e) {}
                },
                "DT" : (value , propertyName, newDataSet, newVR) => {
                    return vrFunc.CS(value , propertyName, newDataSet , newVR);
                },
                "IS" : (value , propertyName, newDataSet, newVR) => {
                    let scopeDataSet = newDataSet != undefined ? newDataSet : dataset;
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        let str = scopeDataSet.string(propertyName);
                        value.push(parseInt(str));
                        for(var i=1; i < dataset.elements[propertyName].length/2; i++) {
                            try {
                                str = scopeDataSet.string(propertyName,i);
                                value.push(parseInt(str));
                            } catch (e) {
                                //console.log(i);
                                //console.log(e);
                            }
                        }
                        return getVRDicomJson(vr , value);
                    } catch(e) {}
                } , 
                "TM" : (value , propertyName, newDataSet, newVR) => {
                    return vrFunc.CS(value , propertyName, newDataSet,newVR);
                } , 
                "UI" : (value , propertyName, newDataSet, newVR) => {
                    return vrFunc.CS(value , propertyName, newDataSet,newVR);
                } , 
                "OB" : (value , propertyName, newDataSet, newVR) => {
                    if (newVR) {
                        vr = newVR;
                    }
                    try {
                        let element = dataset.elements[propertyName];
                        if (newDataSet) {
                            element = newDataSet.elements[propertyName];
                        }
                        if (element.length <100) {
                            let byte = [];
                            for (let i = element.dataOffset ; i< element.dataOffset +element.length ; i++) {
                                byte.push(dicomfile[i]);
                            }
                            value.push(new Buffer.from(byte).toString('base64'));
                            return getVROBDicomJson(vr , value);
                        } else {
                            return value;
                        }
                    } catch(e) {}
                } , 
                "LO" : (value , propertyName, newDataSet, newVR) => {
                    return vrFunc.CS(value , propertyName, newDataSet , newVR);
                } , 
                "LT" : (value , propertyName, newDataSet, newVR) => {
                    return vrFunc.CS(value , propertyName, newDataSet , newVR);
                } ,
                "SH" : (value , propertyName, newDataSet, newVR) => {
                    if (newVR) {
                        vr = newVR;
                    }
                    return vrFunc.CS(value , propertyName, newDataSet , newVR);
                } ,
                "SQ" : (value , propertyName, newDataSet, newVR) => {
                    if (newVR) {
                        vr = newVR;
                    }
                    let element =dataset.elements[propertyName];
                    if (newDataSet) {
                        element = newDataSet.elements[propertyName];
                    }
                    function getSQDicomJson (iValue) {
                        for (let item of element.items) {
                            let SQelements = item.dataSet.elements;
                            let obj = {};
                            for (let SQtag in SQelements) {
                                let SQvr = item.dataSet.elements[SQtag].vr;
                                if (vrFunc[SQvr]) {
                                    obj[SQtag.replace("x" , "").toUpperCase()] = vrFunc[SQvr]([] ,SQtag , item.dataSet , SQvr);
                                }
                            }
                            iValue.push(obj);
                        }
                        return iValue;
                    }
                    return getVRDicomJson("SQ" , getSQDicomJson(value));
                }
            }
            let dicomJsonObj = {};
            if (vrFunc[vr]) {
                try {
                    dicomJsonObj =await vrFunc[vr]([] , propertyName);
                    dicomObj[propertyName.replace("x" , "").toUpperCase()] = dicomJsonObj;
                } catch (e) {
                    console.error(e);
                }
            }
        }
        return  resolve(dicomObj);
    });
}

async function getFileDCM2Json (filename) {
    let isExist = fileFunc.checkExist(filename);
    if (isExist) {
        let file = fs.createReadStream(filename);
        return resolve(file);
    }
    return filename;
}
module.exports.DCM2Json = async function (dirname) {
    return new Promise (async (resolve) => {
        let dicomfile = await getFileDCM2Json(dirname);
        let getJsonWithFile = async (iFile) => {
            return new Promise((resolve)=> {
                let dicomJsonStream = dicom.json.file2jsonstream(iFile , function (err) {
                    if (err) {
                        return resolve(false);
                    }
                });
                let jsonChunk = [];
                dicomJsonStream.on('data' , (data)=> {
                    jsonChunk.push(data);
                });
                dicomJsonStream.on('error' , () => {
                    return resolve(false);
                });
                dicomJsonStream.on('end' , () => {
                    let result = Buffer.concat(jsonChunk).toString('utf-8');
                    let jsonRes = JSON.parse(result);
                    return resolve(jsonRes);
                });
            });
        }
        let getJsonWithStream = async (iFile) => {        
            return new Promise (async (resolve)=> {
                try {
                    let dicomJsonStream =iFile.pipe(dicom.decoder({ guess_header: true})).pipe(new dicom.json.JsonEncoder({}));
                    let jsonChunk = [];
                    dicomJsonStream.on('data' , (data)=> {
                        jsonChunk.push(data);
                    });
                    dicomJsonStream.on('error' , (e) => {
                        console.error(e);
                        return resolve(false);
                    });
                    dicomJsonStream.on('end' , () => {
                        return resolve(jsonChunk);
                    });
                } catch (e) {
                    console.log(e);
                }
            });
        }
        let getFunc = {
            "object" : getJsonWithStream , 
            "string" : getJsonWithFile
        }
        let result = await getFunc[typeof(dicomfile)](dicomfile);
        while (result.length <= 5) {
            dicomfile = await getFile();
            result = await getFunc[typeof(dicomfile)](dicomfile);
        }
        let resultBufferStr = Buffer.concat(result).toString('utf-8');
        let jsonRes = JSON.parse(resultBufferStr);
        return resolve(jsonRes);
    });
}

async function ImagingStudy_ToDate(List)
{
    return new Promise ((resolve)=>{
        for (var i = 0 ; i< List.length ; i++)
        {
            List[i].started = new Date(List[i].started);
            for (var j = 0; j < List[i].series.length ; j++)
            {
                List[i].series[j].started = new Date(List[i].started);
            }
        }
        resolve(true);
    });
}

module.exports.seriesBelongImagingStudy = seriesBelongImagingStudy;
async function seriesBelongImagingStudy(imagingStudies)
{
    imagingStudies = await getObjectBelong(imagingStudies,"identifier[0].value" , "series");
    for (let i = 0 ;i < imagingStudies.length ; i++)
    {
        imagingStudies[i].series.sort(function(a, b)
        {
            if (a.number > b.number) return 1;
            if (b.number > a.number) return -1;
        });
    }
    return imagingStudies;
}

module.exports.instanceBelongSeries = instanceBelongSeries

async function instanceBelongSeries(imagingStudies)
{
    for (let i = 0 ; i< imagingStudies.length ; i++) {
        imagingStudies[i].series = await getObjectBelong(imagingStudies[i].series , "uid" , "instance")
    }
    for (let i = 0 ;i < imagingStudies.length ; i++)
    {
        for (let j = 0 ; j < imagingStudies.series.length ; j++) {
            imagingStudies[i].series[j].instance.sort(function(a, b)
            {
                if (a.number > b.number) return 1;
                if (b.number > a.number) return -1;
            });
        }
    }
    return imagingStudies;
}