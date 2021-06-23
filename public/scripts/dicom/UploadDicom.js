var UploadApp = angular.module("UploadApp", []);
UploadApp.controller("UploadCtrl", function ($scope, $location, $window, UploadService) {
    $scope.fileList = [];
    $scope.uploadProgres = 0;
    $scope.IsNewUpload = true;
    $scope.IsUploading = false;
    $scope.AllowSameFileName = false;
    $scope.totalUpload = 0;
    $scope.successUpload = 0;
    $scope.errorUpload = 0;
    $scope.systemInfo = '';
    $scope.uploadResult = '';

    $scope.dragEnter = function () {
        document.body.style.borderColor = 'red';
    }

    $scope.dragLeave = function () {
        document.body.style.borderColor = 'gainsboro';
    }

    $scope.dragoverHandler = function (evt) {
        evt.preventDefault();
    }

    $scope.dropHandler = function (evt) {
        evt.preventDefault();
        $scope.appendFiles(Array.from(evt.dataTransfer.files));
    }

    $scope.appendFiles = function (files) {
        if ($scope.IsUploading) {
            ApplySystemInfo("info", "", "正在進行上傳作業，請稍後...");
            return;
        } else if (!$scope.IsNewUpload) {
            $scope.fileList = [];
            $scope.IsNewUpload = true;
            $scope.uploadProgres = 0;
            $scope.totalUpload = 0;
            $scope.successUpload = 0;
            $scope.errorUpload = 0;
        };
        let unallowFile = [];
        for (let i = 0; i < files.length; i++) {
            let fileExtension = files[i].name.slice((files[i].name.lastIndexOf(".") - 1 >>> 0) + 2);
            if (typeof (fileExtension) == 'undefined' || fileExtension.indexOf("dcm") == -1) {
                unallowFile.push(files[i].name);
            } else {
                let fileObj = {
                    'fileName': (files[i].webkitRelativePath) ? (files[i].webkitRelativePath) : (files[i].name),
                    'Status': 'ready',
                    'ProgressRate': 0,
                    'Result': "新增時間：" + getNowTime().Y + "-" + getNowTime().M + "-" + + getNowTime().D + " " + getNowTime().moon + " " + getNowTime().h + ":" + getNowTime().m + ":" + getNowTime().s,
                    'FormData': new FormData()
                };
                fileObj.FormData.append('file', files[i]);
                let fileExist = false;
                if (!$scope.AllowSameFileName) {
                    $scope.fileList.forEach((item, index) => {
                        if (item.fileName == fileObj.fileName) {
                            $scope.fileList[index] = fileObj;
                            fileExist = true;
                        };
                    })
                }
                if (!fileExist) $scope.fileList.push(fileObj);
            }
        }
        if (unallowFile.length > 0) {
            let text = "無法上傳 " + unallowFile.length + " 個檔案：\n";
            unallowFile.forEach((item, index) => {
                text += (index + 1) + ". " + item + "\n"
            })
            ApplySystemInfo("warning", "請選擇.dcm檔上傳！", text);
        }
        $scope.$applyAsync();
        // Clear file
        document.getElementById("inputFile").value = "";
        document.getElementById("inputFolder").value = "";
    }

    $scope.removeFile = function (index) {
        if ($scope.IsUploading) {
            ApplySystemInfo("info", "", "正在進行上傳作業，請稍後...");
        } else {
            $scope.fileList.splice(index, 1);
            $scope.$applyAsync();
        }
    }

    $scope.resetUpload = function () {
        let text = ($scope.IsUploading) ? "正在進行上傳作業，將會遺失進度，確定要重置？" : "確定要重置上傳作業？";
        if (confirm(text)) window.location.reload();
    }

    $scope.uploadFile = async function (index) {
        if ($scope.IsUploading) {
            ApplySystemInfo("info", "", "正在進行上傳作業，請稍後...");
        } else if (index != undefined) {
            if (confirm("確認要上傳 " + $scope.fileList[index].fileName + "？")) {
                $scope.IsNewUpload = false;
                $scope.IsUploading = true;
                $scope.totalUpload = 1;
                await FileUploader($scope.fileList[index])
                    .then(res => {
                        ApplySystemInfo("success", "上傳成功", $scope.fileList[index].fileName + " 上傳完成");
                        $scope.uploadResult = "上傳完成：" + $scope.fileList[index].fileName;
                        $scope.totalUpload = 0;
                        $scope.successUpload = 0;
                        $scope.errorUpload = 0;
                        $scope.IsUploading = false;
                    })
            }
        } else {
            if ($scope.fileList.length == 0) {
                ApplySystemInfo("info", "請先選擇上傳檔案", "\"拖曳檔案\" 或 \"選擇檔案、資料夾\"。");
            } else if (confirm("確認要上傳 " + $scope.fileList.length + " 個檔案？")) {
                $scope.IsNewUpload = false;
                $scope.IsUploading = true;
                $scope.totalUpload = $scope.fileList.length;
                // Start Upload
                for (let i = 0; i < $scope.fileList.length; i++) {
                    await FileUploader($scope.fileList[i]);
                }
                // Complete Upload
                ApplySystemInfo("success", "上傳成功", "上傳 " + $scope.totalUpload + " 個檔案完成。\n" + $scope.successUpload + "成功。" + $scope.errorUpload + "失敗");
                $scope.uploadResult = "上傳完成：" + $scope.successUpload + " 筆成功，" + $scope.errorUpload + " 筆失敗，共 " + $scope.totalUpload + " 個檔案。"
                $scope.totalUpload = 0;
                $scope.successUpload = 0;
                $scope.errorUpload = 0;
                $scope.IsUploading = false;                
            }
        }
    }

    function FileUploader(file) {
        return new Promise(resolve => {
            let xhr = new XMLHttpRequest();
            xhr.open('POST', '/dicom-web/studies');
            xhr.setRequestHeader("Accept", "*/*");
            
            xhr.onload = function () {
                //上傳完成
                file.ProgressRate = 0;
                if (xhr.status === 200) {
                    $scope.successUpload++;
                    file.Status = "success";
                    file.Result = xhr.statusText;
                } else {
                    $scope.errorUpload++;
                    file.Status = "fail";
                    file.Result = xhr.statusText;
                }
                $scope.$applyAsync();
                resolve();
            };
            xhr.upload.onprogress = function (evt) {
                if (evt.lengthComputable) {
                    file.ProgressRate = (evt.loaded / evt.total * 100 | 0);
                    file.Status = file.ProgressRate + "%";
                    (file.ProgressRate == 100) && (file.Status = "處理中");
                    $scope.$applyAsync();
                }
            }
            let myBlob = formDataToBlob(file.FormData);
            let m = myBlob.type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
            let boundary = m[1] || m[2];
            xhr.setRequestHeader("Content-Type", `multipart/related; type="application/dicom"; boundary=------------------------${boundary}`);
            xhr.send(myBlob);
        })
    }

    $scope.setTextColor = (text) => {
        if (text == 'success') return 'text-success';
        else if (text == 'warning') return 'text-warning';
        else if (text == 'fail') return 'text-danger';
        else if (text == 'ready') return 'text-primary';
        else return 'text-info';
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

    function ApplySystemInfo(type, title, text) {
        $("#SystemInfoTitle").text("系統訊息：" + title);
        $("#SystemInfoTitle").removeClass();
        $("#SystemInfoTitle").addClass("text-" + type);
        $("#SystemInfoText").text(text);
        $('#SystemInfoModal').modal('toggle');
    }

    function getNowTime() {
        let date = new Date();
        let time = {
            'Y': date.getFullYear(),
            'M': ("0" + (date.getMonth() + 1)).slice(-2),
            'D': ("0" + date.getDate()).slice(-2),
            'h': ("0" + date.getHours()).slice(-2),
            'm': ("0" + date.getMinutes()).slice(-2),
            's': ("0" + date.getSeconds()).slice(-2),
            'moon': (("0" + date.getHours()).slice(-2) < 12) ? ('上午') : ('下午')
        }
        return time
    }
});

UploadApp.service('UploadService', function ($http, $q, $location) {

});
