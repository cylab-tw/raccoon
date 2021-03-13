


var UploadApp = angular.module("UploadApp", ["commonApp"]);
UploadApp.controller("UploadCtrl", function ($scope, $location, $window, UploadService, commonService) {
    $scope.fileList = [];
    $scope.selectFileName = '';
    $scope.selectQueryKey = [];
    $scope.selectFileResult = [];
    $scope.uploadProgres = 0;
    $scope.uploadCompleted = false;
    $scope.systemStatus = "準備上傳";
    const uploadApiUrl = "/dicom-web/studies";
    let FD = new FormData();
    let UploadResult = {};
    commonService.user.init($scope);
    $scope.dragEnter = function () {
        document.getElementById("infoTable").style.borderColor = 'red';
        document.getElementById("dragTips").innerHTML = '拖曳至下方紅框';
    }

    $scope.dragLeave = function () {
        document.getElementById("infoTable").style.borderColor = '';
        document.getElementById("dragTips").innerHTML = '拖曳檔案或點擊"選擇檔案"';
    }

    $scope.dragoverHandler = function (evt) {
        evt.preventDefault();
    }

    $scope.dropHandler = function (evt) {
        evt.preventDefault();
        $scope.appendFiles(Array.from(evt.dataTransfer.files));
    }

    $scope.appendFiles = function (files) {
        if ($scope.uploadCompleted) $scope.resetUpload();
        for (let i = 0; i < files.length; i++) {
            let fileExtension = files[i].name.slice((files[i].name.lastIndexOf(".") - 1 >>> 0) + 2);
            if (typeof (fileExtension) == 'undefined') {
                alert("無法辨識的檔案類型，請選擇.dcm檔！");
            } else if (fileExtension.indexOf("dcm") == -1) {
                alert("無法上傳 " + files[i].name + "，請選擇.dcm檔！");
            } else {
                let fileList = FD.getAll('Files[]');
                let fileExist = false;
                fileList.forEach(item => {
                    if (item.name == files[i].name) fileExist = true;
                })
                if (!fileExist) FD.append('Files[]', files[i]);
            }
        }
        $scope.showFiles();
        // Clear file
        document.getElementById("file").value = "";
    }

    $scope.cancelFile = function (fileName) {
        let files = FD.getAll('Files[]');
        FD = new FormData();
        for (let i in files) {
            if (files[i].name !== fileName) {
                FD.append('Files[]', files[i]);
            }
        }
        $scope.showFiles();
    }

    $scope.showFiles = function () {
        let files = FD.getAll('Files[]');
        $scope.fileList = [];
        for (let i in files) {
            $scope.fileList.push({ fileName: files[i].name, Status: "ready", Result: "-" });
        }
        $scope.$applyAsync();
    }

    $scope.resetUpload = function () {
        FD = new FormData;
        $scope.uploadProgres = 0;
        $scope.uploadCompleted = false;
        $scope.systemStatus = "準備上傳";
        $scope.showFiles();
    }

    $scope.uploadFiles = async function () {
        const BOUNDORY = `------------------------${makeid(16)}`;

        if (FD.getAll('Files[]').length > 0) {
            if (confirm("確認要上傳嗎？")) {
                axios.post(uploadApiUrl, FD, {
                    headers: {
                        "Content-Type": `multipart/related; boundary=${BOUNDORY}`
                    },
                    onUploadProgress: (evt) => {
                        if (evt.lengthComputable) {
                            $scope.uploadProgres = (evt.loaded / evt.total * 100 | 0);
                            $scope.systemStatus = $scope.uploadProgres + "%";
                            ($scope.uploadProgres == 100) && ($scope.systemStatus = "正在儲存至資料庫...");
                            $scope.$applyAsync();
                        }
                    }
                })
                .then(function (res) {
                    if (res.status == 200) {
                        alert("上傳成功");
                        $scope.systemStatus = "已完成上傳";
                        UploadResult = res.data.result;
                        $scope.fileList.forEach(item => {
                            if (UploadResult.indexOf(item.fileName) != -1) {
                                item.Status = "success";
                                item.Result = "上傳完成";
                            } else {
                                item.Status = "fail";
                                item.Result = "上傳失敗";
                            }
                        })
                        $scope.$applyAsync();
                    }
                    $scope.$applyAsync();
                })
                .catch(function (error) {
                    console.log(error)
                    alert("伺服器發生錯誤");
                    $scope.systemStatus = "伺服器發生錯誤";
                    $scope.fileList.forEach(item => {
                        item.Status = "fail";
                        item.Result = "上傳失敗";
                    })
                });
            } else {
                alert("已取消上傳作業。");
            }
        } else {
            alert("請選擇要上傳的檔案。");
        }
    }
    function makeid(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
});

UploadApp.service('UploadService', function ($http, $q, $location) {

});

