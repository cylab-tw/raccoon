let imageMSApp = angular.module('imageMSApp' , ['ui.bootstrap' , 'commonApp']);
imageMSApp.controller('imageMSCtrl' , function ($scope , imageMSService , commonService) {
    $scope.loggedUser = "";
    commonService.user.init($scope);
    $scope.dataList = [];
    $scope.openSeries = {studyID : "" , seriesList : []};
    $scope.parentStudy = 0;
    $scope.openInstance = {studyID : "" , seriesID : "" , instanceList : []};
    $scope.wadoUrlList = [];
    $scope.isOpenSeries = false;
    $scope.isOpenInstance = false;
    $scope.isSearched = false;
    $scope.curStudyPage = 1; //table
    $scope.numStudyPerPage = 10; //table
    $scope.totalItem = 0;
    $scope.orderStudyCol = "identifier.value";
    $scope.orderStudyReverse = false;
    $scope.orderSeriesCol = "number";
    $scope.orderSeriesReverse = false;
    $scope.orderInstanceCol = "number";
    $scope.orderInstanceReverse = false;
    $scope.clickStudy = 0;
    $scope.clickSeries = 0;
    $scope.clickInstance = 0;
    $scope.tagsStudy = {
        subject : {} ,
        resourceType : "" , 
        identifier : {} ,
        status : "",
        started : ""
    }
    $scope.tagsSeries = {
        modality : "" , 
        bodySite : "" ,
        uid : "" ,
        number : "",
        started : ""
    }
    $scope.tagsInstance = {
        uid : "" , 
        number : "" ,
        title : "" , 
        sopClass : ""
    }
    var keyArray =  ["Modality" , "fromDate" , "endDate"  ,"StudyInstanceUID" , "PatientID" , "PatientName"];
    $scope.init = function () {
        let qs = window.location.search;
        let paramValue = new URLSearchParams(qs);
        for (let i = 0  ; i < keyArray.length  ;i++) {
            let nowItem = keyArray[i];
            if (typeof($scope[nowItem]) == 'undefined') {
                $scope[nowItem]  = "";
            }
            let nowParamValue = paramValue.get(nowItem);
            if (nowParamValue != null) {
                $scope[nowItem] =nowParamValue;
            }
        }
    }

    $scope.test = function () {
        console.log($scope.fromDate);
        console.log($scope.endDate);
    }

    $scope.QIDO = async function()
    {
        if ($scope.StudyDate!= undefined && $scope.StudyDate !="")
        {
            let dates = $scope.StudyDate.match(/\d+/g);
            if (dates.length == 1)
            {
                if (!check_Date(dates[0]))
                {
                    alert('Invalid StudyDate');
                    return;
                }
            }
            else if (dates.length ==2)
            {
                if (!check_Date(dates[0]) || !check_Date(dates[1]))
                {
                    alert('Invalid StudyDate');
                    return;
                }
            }
        }
        if ($scope.isSearched) {
            $scope.curStudyPage = 1;
        }
        raccoon.blockUI();
        imageMSService.QIDO($scope).then(async function(res)
        {
            $scope.dataList = res.data[0];
            $scope.totalItem = res.data[1];
            //console.log($scope.dataList);
            if ($scope.dataList == null ||$scope.dataList.length <=0 ) {
                alert('no data');
                raccoon.unblockUI();
                return;
            }
            for (let i = 0 ; i < $scope.dataList.length ; i++) {
                getOneIdentifier($scope.dataList[i] , 'usual' , true);
                for (let x  = 0  ; x< $scope.dataList[i].oldIdentifier.length ; x++ ) {
                    if ($scope.dataList[i].oldIdentifier[x].use == "official") {
                        $scope.dataList[i].studyID = $scope.dataList[i].oldIdentifier[x].value.substring(8);
                    }
                }
            }
            console.log($scope.dataList);
            $scope.isOpenSeries = false;
            $scope.isOpenInstance = false;
            raccoon.unblockUI();
        });
    }
    $scope.deleteItem = function (iName , iItem) {
        let getDelteStudyUrl = () => {
            let studyID = iItem.studyID;
            return `/api/fhir/ImagingStudy/${studyID}`;
        }
        let getDeletSeriesUrl = () => {
            return `/api/fhir/ImagingStudy/${$scope.openSeries.studyID}/series/${iItem.uid}`;
        }
        let getDeletInstanceUrl = () => {
            return `/api/fhir/ImagingStudy/${$scope.openInstance.studyID}/series/${$scope.openInstance.seriesID}/instances/${iItem.uid}`;
        }
        let url = {
            "Study" :  getDelteStudyUrl,
            "Series" : getDeletSeriesUrl , 
            "Instance" : getDeletInstanceUrl
        }
        let checkIsConfirm = (iText) => {
            return iText === "Delete Confirm";
        }
        if (iName == "Study") {
            let confirmText = $("#deleteStudyConfirmInput").val();
            if (!checkIsConfirm(confirmText)) return;
        } else if (iName == "Series") {
            let confirmText = $("#deleteSeriesConfirmInput").val();
            if (!checkIsConfirm(confirmText)) return;
        } else if (iName == "Instance") {
            let confirmText = $("#deleteInstanceConfirmInput").val();
            if (!checkIsConfirm(confirmText)) return;
        }
        imageMSService.deleteItem(url[iName]()).then(function (res) {
            $(`#btnClosedeletion${iName}Modal`).click();
            let resMessage = {"204" : "delete success" , "500" : "delete failure"}
            if (res.status == 204) {
                alert(resMessage[res.status]);
                $scope.isOpenSeries = false;
                $scope.isOpenInstance = false;
                $scope.QIDO();
            } else {
                alert(resMessage[res.status]);
            }
        });
    }
    $scope.$watch("curStudyPage",function(newValue,oldValue){
        // your code goes here...
        if (newValue != oldValue) {
            $scope.isSearched = false;
            $scope.QIDO();
        }
    });
//#region dowload file function
    $scope.downloadStudy = function (iItem) {
        let port = raccoon.getPort(envConfig.WADO.port);
        let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/${envConfig.WADO.api}/studies/${iItem.studyID}`;
        console.log(url);
        imageMSService.downloadZip(url).then(function (res) {
            console.log(res);
            if (res.status != 200) {
                return;
            }
            let fileNameMatchs = res.headers('Content-Disposition').matchAll(/filename=(.*zip)/gi);
            for (let match of fileNameMatchs) {
                let blob = new Blob([res.data], {type: "application/zip"});
                let a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.download = match[1];
                a.click();
                window.URL.revokeObjectURL(a.href);
            }
        });
    }

    $scope.downloadSeries = function (iItem) {
        console.log(iItem);
        let port = raccoon.getPort(envConfig.WADO.port);
        let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/${envConfig.WADO.api}/studies/${$scope.openSeries.studyID}/series/${iItem.uid}`;
        console.log(url);
        imageMSService.downloadZip(url).then(function (res) {
            if (res.status != 200) {
                return;
            }
            let fileNameMatchs = res.headers('Content-Disposition').matchAll(/filename=(.*zip)/gi);
            for (let match of fileNameMatchs) {
                let blob = new Blob([res.data], {type: "application/zip"});
                let a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.download = match[1];
                a.click();
                window.URL.revokeObjectURL(a.href);
            }
        });
    }

    $scope.downloadInstance = function (iItem) {
        let port = raccoon.getPort(envConfig.WADO.port);
        let url = `${envConfig.WADO.http}://${envConfig.WADO.hostName}${port}/api/dicom/wado/?requestType=WADO&studyUID=${$scope.openInstance.studyID}`;
        let downloadUrl = `${url}&seriesUID=${$scope.openInstance.seriesID}&objectUID=${iItem.uid}&contentType=application/dicom`;
        let a = document.createElement('a');
        a.href = downloadUrl;
        a.click();
        a.remove();
    }
//#endregion
    
    $scope.openFHIRJson = function (item) {
        let port = raccoon.getPort(envConfig.FHIR.port);
        let url =`${envConfig.FHIR.http}://${envConfig.FHIR.hostName}${port}/${envConfig.FHIR.api}/ImagingStudy/${item.id}`
        window.open(url, "_blank"); 
        //let a = document.createElement('a');
        //a.href = url;
        //a.click();
        //a.remove();
    }

    $scope.orderStudy = function (iName) {
        $scope.orderStudyCol = iName;
        $scope.orderStudyReverse = !$scope.orderStudyReverse;
    }

    $scope.openSeriesClick = function (iItem) {
        $scope.isOpenSeries = true;
        $scope.isOpenInstance  = false ;
        let studyID = iItem.studyID;
        $scope.seriesParent = iItem;
        $scope.openSeries.studyID = studyID;
        $scope.openSeries.seriesList = iItem.series;
    }

    $scope.openInstancesClick = function (iItem) {
        $scope.isOpenInstance = true;
        $scope.openInstance.studyID = $scope.openSeries.studyID;
        $scope.openInstance.seriesID = iItem.uid;
        $scope.openInstance.instanceList = iItem.instance;
        console.log($scope.openInstance);
    }

    $scope.tagsStudyClick = function (iItem) {
        let keys= Object.keys($scope.tagsStudy);
        for (let i = 0 ; i < keys.length ; i++) {
            $scope.tagsStudy[keys[i]] = iItem[keys[i]];
            if ($scope.isObject($scope.tagsStudy[keys[i]])) {
                $scope.setJsonViewer("#tagsStudyJsonRenderer_" + keys[i] , $scope.tagsStudy[keys[i]]);
            }
        }
    }

    $scope.tagsSeriesClick = function (iItem) {
        let keys= Object.keys($scope.tagsStudy);
        for (let i = 0 ; i < keys.length ; i++) {
            $scope.tagsStudy[keys[i]] = iItem[keys[i]];
            if ($scope.isObject($scope.tagsStudy[keys[i]])) {
                $scope.setJsonViewer("#tagsStudyJsonRenderer_" + keys[i] , $scope.tagsStudy[keys[i]]);
            }
        }
    }
    //?????item
    $scope.itemChangeClick = function (iItemName , iItem) {
        $scope[`click${iItemName}`] = iItem;
        console.log($scope[`click${iItemName}`]);
    }

    $scope.tagClick = function (iItem , iTagName) {
        let tagItem = $scope[`tags${iTagName}`];
        let keys= Object.keys(tagItem);
        for (let i = 0 ; i < keys.length ; i++) {
            tagItem[keys[i]] = iItem[keys[i]];
            if ($scope.isObject(tagItem[keys[i]])) {
                $scope.setJsonViewer(`#tags${iTagName}JsonRenderer_` + keys[i] , tagItem[keys[i]]);
            }
        }
    }

    $scope.setVal = function (element , val) {
        $scope[element] = val ;
    }
    //????
   /* $scope.studyTablePaginate = function(value) {
        let start , end  , index ;
        start = ($scope.curStudyPage -1 ) * $scope.numStudyPerPage;
        end = start + $scope.numStudyPerPage;
        index = $scope.dataList.indexOf(value);
        return (start <= index && index < end);
    }*/

    $scope.isObject = function (iItem) {
        return iItem !== undefined && iItem !== null && iItem.constructor == Object;
    }

    $scope.setJsonViewer =  function (iId, iData) {
        $(iId).jsonViewer(iData);
    }
});

imageMSApp.service('imageMSService' , function ($http) {
    return ({
        QIDO: QIDO , 
        deleteItem : deleteItem ,
        downloadZip : downloadZip
    });
    function QIDO($scope) {
        let request = $http({
            method : "GET" ,
            url :"/api/dicom/qido/studies" , 
            params :
            {
                StudyDate : get_Date_Query($scope.fromDate , $scope.endDate),
                ModalitiesInStudy : $scope.Modality,
                PatientName : $scope.PatientName,
                PatientID : $scope.PatientID,
                StudyInstanceUID : $scope.StudyInstanceUID ,
                limit : 10 , 
                offset : ($scope.curStudyPage-1) * 10
            } 
        });
        return (request.then(handleSuccess , handleError));
    }

    function deleteItem(url) {
        let request = $http({
            method : "delete" , 
            url : url
        });
        return (request.then(handleSuccess  ,handleError));
    }

    function downloadZip (url) {
        let request = $http({
            method : "get" , 
            headers : {
                accept : 'application/zip'
            },
            url : url ,
            responseType:'arraybuffer'
        });
        return (request.then(handleSuccess  ,handleError));
    }



    function handleSuccess(res) {
        return res;
    }
    function handleError(res) {
        return res
    }
});
$(function () {
    $("#deletionStudyModal").on("show.bs.modal" , function () {
        $("#deleteStudyConfirmInput").val("");
    });
    $("#deletionSeriesModal").on("show.bs.modal" , function () {
        $("#deleteSeriesConfirmInput").val("");
    });
    $("#deletionInstanceModal").on("show.bs.modal" , function () {
        $("#deleteInstanceConfirmInput").val("");
    });
});
