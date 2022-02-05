'use strict';
const mongodb = require('models/mongodb');
const mongoFunc = require('models/mongodb/func');
const mongoose = require('mongoose');

const FHIRFilter = {
    _id: 0,
    __v: 0,
    'identifier._id': 0,
    'subject._id': 0,
    'subject.identifier._id': 0,
    'series.modality._id': 0,
    'series.bodySite._id': 0,
    'series._id': 0,
    'series.instance._id': 0,
    'series.instance.store_path': 0,
    'dicomJson': 0,
    'series.dicomJson': 0,
    'series.instance.dicomJson': 0,
    'series.instance.metadata': 0,
    report: 0,
    patient: 0
}
module.exports = async function (req, res) {
    let reqData = req.body;
    let sendData =
    {
        "true": (data) => {
            res.status(201).json(data)
        },
        "false": (error) => {
            res.status(500).json(error)
        }
    }
    delete reqData["_id"];
    let [updateStatus, doc] = await mongoUpdate({ id: req.params.id }, reqData);
    let updatedDoc = await mongodb.ImagingStudy.findOne({
        _id : doc.value._doc._id
    }, FHIRFilter);
    return sendData[updateStatus.toString()](updatedDoc);
};
module.exports.putFHIRImagingStudyWithoutReq = async function (id , data) {
    delete data["_id"];
    let [updateStatus, doc] = await mongoUpdate({ id: id }, data);
    if (updateStatus) {
        return doc.value.id;
    }
    return false;
} 
async function mongoUpdate(query, data) {
    return new Promise((resolve , reject) => {
        mongodb.ImagingStudy.findOneAndUpdate(query, { $set: data } , {new:true  ,upsert: true , rawResult : true}, function (err, doc) {
            if (err) {
                console.error(err);
                return reject([false , err]);
            } 
            return resolve([true, doc]);
        });
    });
}

//獲取特定Series的Study
async function getImagingStudySeries(series) {
    return new Promise(async (resolve) => {
        let series_query =
            [
                {
                    $match:
                    {
                        "series.uid": series.uid
                    }
                },
                {
                    $addFields:
                    {
                        "SeriesIndex":
                        {
                            $indexOfArray: ["$series.uid", series.uid]
                        }
                    }
                }
            ]
        await mongodb.ImagingStudy.aggregate([series_query], async function (err, oImagingStudy) {
            if (err) {
                return resolve(false);
            }
            return resolve(oImagingStudy);
        });
    });
}

async function getSeriesInstance(seriesUid, instance) {
    return new Promise(async (resolve) => {
        let query =
            [
                {
                    $match:
                    {
                        $and: [{ "series.uid": seriesUid }, { "series.instance.uid": instance.uid }]
                    }
                },
                {
                    $unwind: "$series"
                },
                {
                    $addFields:
                    {
                        "instanceIndex":
                        {
                            $indexOfArray: ["$series.instance.uid", instance.uid]
                        }
                    }
                }
            ]
        let agg = await mongoFunc.aggregate_Func('ImagingStudy', query);
        if (agg) {
            return resolve(agg);
        }
    });

}

async function InsertImagingStudy(Insert_Data, id) {
    return new Promise(async (resolve, reject) => {
        let identifier_query = {
            identifier: {
                $elemMatch: {
                    value: Insert_Data.identifier[0].value
                }
            }
        }
        await mongodb.ImagingStudy.findOne(identifier_query, async function (err, item) {
            if (err) {
                console.log(err);
                return resolve([false, err]);
            } else if (item != null) { //update series if have imagingstudy 
                let ImagingStudy = await new mongodb.ImagingStudy(item);
                let tempInsertData = JSON.parse(JSON.stringify(Insert_Data));
                delete tempInsertData.series;
                let dataKeys = Object.keys(tempInsertData);
                //update imagingstudy exclude series
                for (let y = 0; y < dataKeys.length; y++) {
                    ImagingStudy[dataKeys[y]] = tempInsertData[dataKeys[y]];
                }
                for (let x = 0; x < Insert_Data.series.length; x++) {
                    let series = Insert_Data.series[x];
                    let seriesStudy = await getImagingStudySeries(series);
                    if (seriesStudy[0]) {
                        for (let j = 0; j < series.instance.length; j++) {
                            let instance = series.instance[j];
                            let updateSeries = async function () {
                                return new Promise((resolve) => {
                                    let tempSeries = JSON.parse(JSON.stringify(series));
                                    delete tempSeries.instance;
                                    let seriesKeys = Object.keys(tempSeries);
                                    for (let i = 0; i < seriesKeys.length; i++) {
                                        ImagingStudy.series[seriesStudy[0].SeriesIndex]["_doc"][seriesKeys[i]] = tempSeries[seriesKeys[i]];
                                    }
                                    return resolve(true);
                                });
                            }
                            await updateSeries();
                            let IsExist = await IsInstanceExist(instance.uid);
                            if (IsExist) {
                                //TODO 覆蓋原先資料
                                //let message =await errorHandler({message:"The instance is duplicate :" +Insert_Data.series[x].instance[j].uid});
                                let InstanceStudy = await getSeriesInstance(series.uid, instance);
                                let instanceIndex = -1;
                                for (let data in InstanceStudy) {
                                    if (InstanceStudy[data].instanceIndex != -1) {
                                        instanceIndex = InstanceStudy[data].instanceIndex;
                                    }
                                }
                                ImagingStudy.series[seriesStudy[0].SeriesIndex].instance[instanceIndex] = instance;
                                await ImagingStudy.save(function (err, doc) {
                                    //let message = ('ImagingStudy save status:' , err?'fail':'success') ;
                                    return resolve(err ? [false, err] : [true, doc]);
                                });
                            } else {
                                await ImagingStudy.series[seriesStudy[0].SeriesIndex].instance.push(instance);
                                await ImagingStudy.save(function (err, doc) {
                                    //let message = ('ImagingStudy save status:' , err?'fail':'success') ;
                                    return resolve(err ? [false, err] : [true, doc]);
                                });
                            }
                        }
                    } else { // insert series
                        let ImagingStudy = await new mongodb.ImagingStudy(item);
                        ImagingStudy.series.push(series);
                        await ImagingStudy.save(function (err, doc) {
                            // let message = ('ImagingStudy save status:' , err?'fail':'success') ;
                            return resolve(err ? [false, err] : [true, doc]);
                        });
                    }
                }
            } else {//new imagingstudy
                const mongoUUID = new mongoose.Types.ObjectId;
                Insert_Data.id = id.replace("urn:oid:", "");
                let ImagingStudy = new mongodb.ImagingStudy(Insert_Data);
                await ImagingStudy.save(function (err, doc) {
                    //console.log('ImagingStudy save status:' , err?'fail':'success');
                    return resolve(err ? [false, err] : [true, doc]);
                });
            }
        });
    });
    //#endregion
}


async function IsInstanceExist(uid) {
    return new Promise(async (resolve, reject) => {
        let instance_query =
        {
            series:
            {
                $elemMatch:
                {
                    "instance.uid": uid
                }
            }
        }
        await mongodb.ImagingStudy.findOne(instance_query, async function (err, item) {
            if (err)
                return reject(new Error(err));
            if (item) {
                return resolve([true, item._id]);
            }
            else {
                return resolve(false);
            }
        });
    });
}