const {dicomjson} = require('../../../models/FHIR/dicom-tag');
const {QIDORetAtt} = require('../../../models/FHIR/dicom-tag');
const mongoFunc = require('../../../models/mongodb/func');
const {ToRegex} = require('../../Api_function');
const {mongoDateQuery} = require('../../../models/mongodb/func');
const {Refresh_Param} = require('../../Api_function');
const {textSpaceToOrCond} = require('../../Api_function');
const _ =require('lodash');
const moment = require('moment');
const {qidorsFunc} = require('./qido-rs');
const { setRetrieveURL } = require('../../../models/DICOMWeb');
const { logger } = require("../../../utils/log");

module.exports = async function (req , res) {
    logger.info(`[QIDO-RS] [Path: /series, Retrieve all of instances in the database] [Request query: ${JSON.stringify(req.query)}]`);
    console.log(req.query);
    let limit = req.query.limit || 1000 ;
    let skip = req.query.offset || 0;
    delete req.query["limit"];
    delete req.query["offset"];
    let qs = _.cloneDeep(req.query);
    //let qs = JSON.parse(JSON.stringify(req.query));
    //res.send("qido:" + req.query);
    let qsKeys = Object.keys(qs).sort();
    for (let i = 0 ; i < qsKeys.length ; i++) {
        if (!qs[qsKeys[i]] || qs['FHIR']) {
            delete qs[qsKeys[i]];
        }
    }
    //將搜尋欄位改成全是dicomTag代碼
    let newQS = await qidorsFunc.qsDICOMTag(qs);
    newQS = await Refresh_Param(newQS);
    let keys = Object.keys(req.params);
    let paramsStr = "";
    for (let i = 0 ; i < keys.length ; i++) {
        paramsStr += keys[i]; 
    }
    if (!paramsStr) {
        paramsStr = "studyID";
    }
    /*let QIDOFunc = {"studyID" :getStudyDicomJson , "studyIDseriesID":getSeriesDicomJson , "studyIDseriesIDinstanceID": getInstanceDicomJson};*/
    let docs =  await getStudiesInstanceDicomJson(newQS , req.params , parseInt(limit)  , parseInt(skip));
    for (let i  in docs) {
        let studyDate = _.get(docs[i] , "00080020.Value");
        if (studyDate) {
            for (let j in studyDate) {
                let studyDateYYYYMMDD = moment(studyDate[j]).format( "YYYYMMDD").toString();
                studyDate[j] = studyDateYYYYMMDD;
            }
            _.set(docs[i] , "00080020.Value" , studyDate);
        }
        docs[i] = await qidorsFunc.sortField(docs[i]);
    }
    if (docs.length == 0 ) {
        return res.status(204).send([]);
    }
    res.setHeader('Content-Type' , 'application/dicom+json');
    setRetrieveURL(docs , 2);
    return res.status(200).json(docs);
};
//#region get root instances
async function getStudiesInstanceDicomJson(iQuery , iParam , limit , skip) {
    let unwindField = [{
        $unwind : '$series'
    },  {
        $unwind : '$series.instance'
    }];
    let level =  ['study' , 'series' , 'instance'];
    let mongoAgg = await qidorsFunc.getMongoAgg(iQuery , unwindField , level , limit , skip);
    let docs = await mongoFunc.aggregate_Func('ImagingStudy',mongoAgg);
    //console.log(docs);
    return docs;
}
//#endregion