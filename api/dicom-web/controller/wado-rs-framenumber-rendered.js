const { sendBadRequestMessage } = require('../../../models/DICOMWeb/httpMessage');
const { getFrameImage } = require('../../../models/dcmtk');
const mongoFunc = require('../../../models/mongodb/func');
const dicomParser = require('dicom-parser');
const fs = require('fs');
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
    if (headerAccept != "*/*" && headerAccept != "image/jpeg") {
        return sendBadRequestMessage(res , `header accept only allow */* or image/jpeg , exception : ${headerAccept}`);
    }
    let getInstanceStatu = await getInstance(req.params);
    if (getInstanceStatu.statu) {
        let imagePath = getInstanceStatu.path;
        let dicomRs = fs.readFileSync(`${process.env.DICOM_STORE_ROOTPATH}${imagePath}`);
        let dicomDataset = dicomParser.parseDicom(dicomRs);
        let dicomNumberOfFrames = dicomDataset.intString("x00280008") || 1;
        dicomNumberOfFrames = parseInt(dicomNumberOfFrames);
        if (req.params.frameNumber > dicomNumberOfFrames) {
            return sendBadRequestMessage(res , `Bad frame number , This instance NumberOfFrames is : ${dicomNumberOfFrames} , But request ${req.params.frameNumber}`);
        }
        let getFrameImageStatu = await getFrameImage(imagePath , req.params.frameNumber);
        if (getFrameImageStatu.statu) {
            let imageStream = getFrameImageStatu.imageStream;
            return imageStream.pipe(res);
        }
    }    
}
