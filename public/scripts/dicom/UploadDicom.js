let uploadApp = angular.module("UploadApp", [
    "pascalprecht.translate",
    "ngCookies"
]);

uploadApp.config(["$translateProvider",  function ($translateProvider) {
    $translateProvider.useStaticFilesLoader({
        prefix: "/i18n/",
        suffix: ".json"
    });

    // Tell the module what language to use by default
    $translateProvider.preferredLanguage("en_US");

    // Tell the module to store the language in the local storage
    $translateProvider.useLocalStorage();
}]);

uploadApp.controller("UploadCtrl", 
    async function ($scope, $translate) {
        let isUploadingStr = await $translate("IS_UPLOADING");

        $scope.fileList = [];
        $scope.uploadProgres = 0;
        $scope.IsNewUpload = true;
        $scope.IsUploading = false;
        $scope.AllowSameFileName = false;
        $scope.totalUpload = 0;
        $scope.successUpload = 0;
        $scope.errorUpload = 0;
        $scope.systemInfo = "";
        $scope.uploadResult = "";

        if (envConfig.login.jwt) raccoon.tokenLogin();


        $scope.setLang = function(lang) {
            $translate.use(lang);
        }

        $scope.dragEnter = function () {
            document.body.style.borderColor = "red";
        };

        $scope.dragLeave = function () {
            document.body.style.borderColor = "gainsboro";
        };

        $scope.dragoverHandler = function (evt) {
            evt.preventDefault();
        };

        $scope.dropHandler = function (evt) {
            evt.preventDefault();
            $scope.appendFiles(Array.from(evt.dataTransfer.files));
        };

        $scope.appendFiles = async function (files) {
            if ($scope.IsUploading) {
                ApplySystemInfo("info", "", isUploadingStr);
                return;
            } else if (!$scope.IsNewUpload) {
                $scope.fileList = [];
                $scope.IsNewUpload = true;
                $scope.uploadProgres = 0;
                $scope.totalUpload = 0;
                $scope.successUpload = 0;
                $scope.errorUpload = 0;
            }
            let unallowFile = [];
            for (let i = 0; i < files.length; i++) {
                let fileExtension = files[i].name.slice(
                    ((files[i].name.lastIndexOf(".") - 1) >>> 0) + 2
                );
                if (
                    typeof fileExtension == "undefined" ||
                    fileExtension.indexOf("dcm") == -1
                ) {
                    unallowFile.push(files[i].name);
                } else {
                    let fileObj = {
                        fileName: files[i].webkitRelativePath
                            ? files[i].webkitRelativePath
                            : files[i].name,
                        Status: "ready",
                        ProgressRate: 0,
                        Time:
                            getNowTime().Y +
                            "-" +
                            getNowTime().M +
                            "-" +
                            +getNowTime().D +
                            " " +
                            getNowTime().h +
                            ":" +
                            getNowTime().m +
                            ":" +
                            getNowTime().s,
                        TwelveHoursPeriod: getNowTime().moon,
                        FormData: new FormData()
                    };
                    fileObj.FormData.append("file", files[i]);
                    let fileExist = false;
                    if (!$scope.AllowSameFileName) {
                        $scope.fileList.forEach((item, index) => {
                            if (item.fileName == fileObj.fileName) {
                                $scope.fileList[index] = fileObj;
                                fileExist = true;
                            }
                        });
                    }
                    if (!fileExist) $scope.fileList.push(fileObj);
                }
            }
            if (unallowFile.length > 0) {
                let cannaUploadFilesTranslateStr = await $translate("upload.CAN_NOT_UPLOAD_X_FILES", unallowFile);
                let text = cannaUploadFilesTranslateStr + "：\n";
                unallowFile.forEach((item, index) => {
                    text += index + 1 + ". " + item + "\n";
                });
                let pleaseSelectDicomFileTranslateStr = await $translate(
                    "upload.PLEASE_SELECT_DICOM_FILE"
                );
                ApplySystemInfo(
                    "warning",
                    pleaseSelectDicomFileTranslateStr,
                    text
                );
            }
            $scope.$applyAsync();
            // Clear file
            document.getElementById("inputFile").value = "";
            document.getElementById("inputFolder").value = "";
        };

        $scope.removeFile = function (index) {
            if ($scope.IsUploading) {
                ApplySystemInfo("info", "", isUploadingStr);
            } else {
                $scope.fileList.splice(index, 1);
                $scope.$applyAsync();
            }
        };

        $scope.resetUpload = async function () {
            let text = $scope.IsUploading
                ? await $translate("upload.UPLOADING_RESET")
                : await $translate("upload.RESET");
            if (confirm(text)) window.location.reload();
        };

        $scope.uploadFile = async function (index) {
            let uploadCompleteStr = await $translate("upload.COMPLETE");
            let uploadSuccessfulStr = await $translate("upload.SUCCESSFUL");
            let confirmToUploadStr = await $translate("upload.CONFIRM_TO_UPLOAD");
            if ($scope.IsUploading) {
                ApplySystemInfo("info", "", isUploadingStr);
            } else if (index != undefined) {
                if (
                    confirm(
                        confirmToUploadStr + " " + $scope.fileList[index].fileName + "？"
                    )
                ) {
                    $scope.IsNewUpload = false;
                    $scope.IsUploading = true;
                    $scope.totalUpload = 1;
                    
                    await FileUploader($scope.fileList[index]).then((res) => {
                        ApplySystemInfo(
                            "success",
                            uploadSuccessfulStr,
                            $scope.fileList[index].fileName +
                                " " +
                                uploadCompleteStr
                        );
                        $scope.uploadResult =
                            uploadCompleteStr+ "：" + $scope.fileList[index].fileName;
                        $scope.totalUpload = 0;
                        $scope.successUpload = 0;
                        $scope.errorUpload = 0;
                        $scope.IsUploading = false;
                    });
                }
            } else {
                if ($scope.fileList.length == 0) {
                    ApplySystemInfo(
                        "info",
                        await $translate("upload.PLEASE_SELECT_FILE_FIRST"),
                        await $translate("upload.SELECT_FILE_INSTRUCTIONS")
                    );
                } else if (
                    confirm(
                        await $translate("upload.CONFIRM_TO_UPLOAD_X_FILES", $scope.fileList)
                    )
                ) {
                    $scope.IsNewUpload = false;
                    $scope.IsUploading = true;
                    $scope.totalUpload = $scope.fileList.length;
                    // Start Upload
                    for (let i = 0; i < $scope.fileList.length; i++) {
                        await FileUploader($scope.fileList[i]);
                    }
                    // Complete Upload
                    let uploadResultStr = await $translate(
                        "upload.SUCCESSFUL_INFO_X_FILES",
                        $scope
                    );
                    ApplySystemInfo(
                        "success",
                        uploadSuccessfulStr,
                        uploadResultStr
                    );
                    $scope.uploadResult = uploadResultStr;
                    $scope.totalUpload = 0;
                    $scope.successUpload = 0;
                    $scope.errorUpload = 0;
                    $scope.IsUploading = false;
                }
            }
        };

        async function FileUploader(file) {
            let processingTranslation = await $translate("upload.PROCESSING");
            return new Promise( (resolve) => {
                let xhr = new XMLHttpRequest();
                xhr.open("POST", "/dicom-web/studies");
                xhr.setRequestHeader("Accept", "*/*");
                
                if (envConfig.login.enable && envConfig.login.jwt) {
                    let token = localStorage.getItem("raccoon_token");
                    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                }
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
                        file.ProgressRate =
                            ((evt.loaded / evt.total) * 100) | 0;
                        file.Status = file.ProgressRate + "%";
                        file.ProgressRate == 100 &&
                            (file.Status = processingTranslation);
                        $scope.$applyAsync();
                    }
                };
                let myBlob = formDataToBlob(file.FormData);
                let m = myBlob.type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
                let boundary = m[1] || m[2];
                xhr.setRequestHeader(
                    "Content-Type",
                    `multipart/related; type="application/dicom"; boundary="${boundary}"`
                );
                xhr.send(myBlob);
            });
        }

        $scope.setTextColor = (text) => {
            if (text == "success") return "text-success";
            else if (text == "warning") return "text-warning";
            else if (text == "fail") return "text-danger";
            else if (text == "ready") return "text-primary";
            else return "text-info";
        };


        function ApplySystemInfo(type, title, text) {
            $translate("SYSTEM_INFO").then(function(translationSysInfo) {
                $("#SystemInfoTitle").text(translationSysInfo + "：" + title);
                $("#SystemInfoTitle").removeClass();
                $("#SystemInfoTitle").addClass("text-" + type);
                $("#SystemInfoText").text(text);
                $("#SystemInfoModal").modal("toggle");
            });
        }

        function getNowTime() {
            let date = new Date();
            let time = {
                Y: date.getFullYear(),
                M: ("0" + (date.getMonth() + 1)).slice(-2),
                D: ("0" + date.getDate()).slice(-2),
                h: ("0" + date.getHours()).slice(-2),
                m: ("0" + date.getMinutes()).slice(-2),
                s: ("0" + date.getSeconds()).slice(-2),
                moon: ("0" + date.getHours()).slice(-2) < 12 ? "AM" : "PM"
            };
            return time;
        }
    }
);
