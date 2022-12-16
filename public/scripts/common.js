function addJWTinHeader(options) {
    if (envConfig.login.enable && envConfig.login.jwt) {
        let token = localStorage.getItem("raccoon_token");
        options.headers = {
            Authorization: `Bearer ${token}`
        };
    }
}

function check_Date(iDate) {
    var flag = moment(iDate, 'YYYYMMDD').isValid();
    if (iDate.length > 8) {
        flag = false;
    }
    return flag;
}

function get_StudyUID(iItem) {
    if (iItem.identifier.value.includes('urn:oid:')) {
        return iItem.identifier.value.substring(8);
    }
    return iItem.identifier.value;
}

function get_Series(iItem) {
    let result = [];
    for (let i = 0; i < iItem.series.length; i++) {
        result.push(iItem.series[i]);
    }
    return result;
}

function get_Date_Query(from_Date, end_Date) {

    if (from_Date != "" && end_Date != "") {
        return `${from_Date}-${end_Date}`;
    }
    else if (from_Date != "") {
        return `${from_Date}-`;
    }
    else if (end_Date != "") {
        return `-${end_Date}`;
    }
}

function getQIDOViewerUri(iItem) {
    let StudyDate = moment(iItem.started).format('YYYYMMDD').toString() + '-';
    console.log(moment(iItem.started).format('YYYYMMDD'));
    let PatientName = iItem.patient[0].name[0].text;
    let PatientID = iItem.subject.identifier.value;
    let StudyInstanceUID = get_StudyUID(iItem);
    let qido_uri = `${envConfig.QIDO.http}://${envConfig.QIDO.hostName}/cornerstonetest309/html/start.html?StudyDate=${StudyDate}&PatientName=${PatientName}&PatientID=${PatientID}&StudyInstanceUID=${StudyInstanceUID}`;
    return qido_uri;
}


function get_One_Wado_Url(iItem, isJPG) {
    let studyUID = get_StudyUID(iItem);
    let port = (envConfig.WADO.port != "80") || (envConfig.WADO.port != "443") ? `:${envConfig.WADO.port}` : "";
    let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/api/dicom/wado/?requestType=WADO&studyUID=${studyUID}`;
    let seriesList = get_Series(iItem);
    if (isJPG) {
        return `${url}&seriesUID=${seriesList[0].uid}&objectUID=${seriesList[0].instance[0].uid}&contentType=image/jpeg`;
    } else {
        return `wadouri:${url}&seriesUID=${seriesList[0].uid}&objectUID=${seriesList[0].instance[0].uid}&contentType=application/dicom`;
    }
}

function getAllWadoUrl(iItem, isJPG) {
    let studyUID = get_StudyUID(iItem);
    let port = ((envConfig.WADO.port) != "80" | (envConfig.WADO.port) != "443") ? `:${envConfig.WADO.port}` : "";
    let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/api/dicom/wado/?requestType=WADO&studyUID=${studyUID}`;
    let seriesList = get_Series(iItem);
    let wadoUrlList = [];
    for (let i = 0; i < seriesList.length; i++) {
        let nowSeries = seriesList[i];
        for (let x = 0; x < nowSeries.instance.length; x++) {
            if (isJPG) {
                wadoUrlList.push(`${url}&seriesUID=${nowSeries.uid}&objectUID=${nowSeries.instance[x].uid}&contentType=image/jpeg`)
            } else {
                wadoUrlList.push(`wadouri:${url}&seriesUID=${nowSeries.uid}&objectUID=${nowSeries.instance[x].uid}&contentType=application/dicom`);
            }
        }
    }
    return wadoUrlList;
}

async function getOneIdentifier(iItem, iUse, mustHave) {
    return new Promise(function (resolve) {
        iItem.oldIdentifier = Array.from(iItem.identifier);
        for (let i = 0; i < iItem.identifier.length; i++) {
            if (iItem.identifier[i].use == iUse) {
                iItem.identifier = Object.assign({}, iItem.identifier[i]);
                return resolve(iItem.identifier);
            }
        }
        if (mustHave) {
            iItem.identifier = Object.assign({}, iItem.identifier[0]);
        } else {
            let emptyIdentifier = {
                value: ""
            }
            iItem.identifier = Object.assign({}, emptyIdentifier);
        }
        return resolve(iItem.identifier);
    });
}

async function sleep(ms = 1) {
    return new Promise(r => setTimeout(r, ms));
}

(function () {
    let raccoon = {
        blockUI: () => {
            $.blockUI({
                message:
                    "<i class='fa fa-spinner fa-pulse orange' style='font-size:600%'></i>",
                //borderWidth:'0px' 和透明背景
                css: { borderWidth: "0px", backgroundColor: "transparent" }
            });
            $("body").css("overflow", "hidden");
        },
        unblockUI: () => {
            $.unblockUI();
            $("body").css("overflow", "auto");
        },
        getPort: (iPort) => {
            return `:${iPort}`;
        },
        setLang: (lang) => {
            angular.element(document.body).scope().setLang(lang);
        },
        tokenLogin:  () => {
            let token = localStorage.getItem("raccoon_token");
            let tokenLoginUrlObj = new URL(
                "/login/token",
                envConfig.backend.baseUrl
            );

            let xhr = new XMLHttpRequest();
            xhr.open("POST", tokenLoginUrlObj.href, true);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.send();

            xhr.onreadystatechange = function() {
                if (
                    this.readyState === XMLHttpRequest.DONE && 
                    this.status !== 200
                ) {
                    console.error("Unauthorized");
                    console.error(xhr.response);
                }
            }
        }
    };
    window.raccoon = raccoon;
})();