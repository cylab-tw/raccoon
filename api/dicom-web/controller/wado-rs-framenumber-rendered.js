const { sendBadRequestMessage } = require('../../../models/DICOMWeb/httpMessage');
const { getFrameImage } = require('../../../models/dcmtk');
const mongoFunc = require('../../../models/mongodb/func');
const mongodb = require('../../../models/mongodb');
const _ = require("lodash");
async function getInstance (iParam) {
    return new Promise (async (resolve)=> {
        let imagesPath = await mongoFunc.getInstanceImagePath(iParam);
        if (imagesPath) {
            return resolve({
                statu : true , 
                path : imagesPath[0]
            });    
        }
        return resolve({
            statu : false
        });
    });
}

module.exports = async function (req , res) {
    let headerAccept = req.headers.accept;
    if (_.isUndefined(headerAccept)) {
        return sendBadRequestMessage(res , `header accept only allow */* or image/jpeg , exception : ${headerAccept}`);
    }
    if (!headerAccept.includes("*/*")  && !headerAccept.includes("image/jpeg")) {
        return sendBadRequestMessage(res , `header accept only allow */* or image/jpeg , exception : ${headerAccept}`);
    }
    let getInstanceStatu = await getInstance(req.params);
    if (getInstanceStatu.statu) {
        let imagePath = getInstanceStatu.path;
        let dicomJson = await mongodb.ImagingStudy.findOne({
            $and : [
                {
                    "dicomJson.0020000D.Value" : req.params.studyID
                } ,
                {
                    "series.uid" : req.params.seriesID
                } , 
                {
                    "series.instance.uid" : req.params.instanceID
                }
            ]
        } , {
            "dicomJson.0020000D" : 1 , 
            "series.uid" : 1 , 
            "series.instance.uid" : 1 ,
            "series.instance.dicomJson.00280008" : 1
        });
        let dataSeries = dicomJson.series;
        let hitSeries = _.find(dataSeries , "uid" ,  req.params.seriesID);
        let hitSeriesInstance = hitSeries.instance;
        let hitInstance = _.find(hitSeriesInstance , {uid : req.params.instanceID});
        let dicomNumberOfFrames = _.get(hitInstance , "dicomJson.00280008.Value.0") || 1;
        dicomNumberOfFrames = parseInt(dicomNumberOfFrames);
        if (req.params.frameNumber > dicomNumberOfFrames) {
            return sendBadRequestMessage(res , `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${req.params.frameNumber}`);
        }
        let getFrameImageStatus = await getFrameImage(imagePath , req.params.frameNumber);
        if (getFrameImageStatus.status) {
            let imageStream = getFrameImageStatus.imageStream;
            return imageStream.pipe(res);
        }
    }    
}
