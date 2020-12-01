function getBasicURL () {
    let port = `:${process.env.DICOMWEB_PORT}`;
    if (port == ":443" || port == ":80") port = "";
    let url = `http://${process.env.DICOMWEB_HOST}${port}/${process.env.DICOMWEB_API}`;
    return url;
}

/**
 * 
 * @param {Object} items 
 * @param {Number} level  0=Study , 1=Series , 2=instance
 */
function setRetrieveURL (items , level) {
    console.log(level);
    for (let item of items) {
        if (level == 0) {
            item  = setStudyRetrieveURL(item);
        } else if (level ==1) {
            item = setSeriesRetrieveURL(item);
        } else if (level == 2 ){
            item = setInstancesRetrieveURL(item);
        }
    }
}
function setStudyRetrieveURL(study) {
    let studyUID = study["0020000D"].Value[0];
    let url = `${getBasicURL()}/studies/${studyUID}`;
    study["00081190"] = {
        vr : "UT" , 
        Value : [url]
    };
    return study;
}

function setSeriesRetrieveURL (series) {
    try {
        let studyUID = series["0020000D"].Value[0];
        let seriesUID = series["0020000E"].Value[0];
        let url = `${getBasicURL()}/studies/${studyUID}/series/${seriesUID}`;
        series["00081190"] = {
            vr : "UT" , 
            Value : [url]
        };
        return series;
    } catch {
        console.log(series);
        return series;
    }
    for (let i in study.series) {
        let series = study.series[i];
        console.log(series.dicomJson["00081190"]);
        series = setInstancesRetrieveURL(series);
    }
}

function setInstancesRetrieveURL (instance) {
    let studyUID = instance["0020000D"].Value[0];
    let seriesUID = instance["0020000E"].Value[0];
    let instanceUID = instance["00080018"].Value[0];
    let url = `${getBasicURL()}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`;
    instance["00081190"] = {
        vr : "UT" , 
        Value : [url]
    };
    return instance;
    for (let i in series.instance) {
        let instance = series.instance[i];
        console.log(instance.dicomJson["00081190"]);
    }
}


module.exports = {
    setRetrieveURL : setRetrieveURL
}
