let dicomToJpegTaskApp = angular.module('dicomToJpegTaskApp', ['ui.bootstrap', 'commonApp']);

dicomToJpegTaskApp.controller('dicomToJpegTaskCtrl', function ($scope, dicomToJpegTaskService, commonService) {
    $scope.resultPerPage = 10;
    $scope.resultCurPage = 1;
    $scope.resultCount = 0;
    $scope.dicomToJpegTaskList = [];
    $scope.query = {
        status: "false",
        offset: 0
    }

    $scope.getDicomToJpegTask = () => {
        console.log($scope.query);
        dicomToJpegTaskService.getDicomToJpegTask($scope.query).then((res)=> {
            $scope.resultCurPage = 1;
            if (res.data) {
                $scope.dicomToJpegTaskList = res.data.data;
                $scope.resultCount = res.data.count;
            }
        })
    }

    $scope.$watch("resultCurPage", function (oldValue, newValue) {
        let offset = ($scope.resultCurPage-1) * $scope.resultPerPage;
        $scope.query.offset = offset;
        dicomToJpegTaskService.getDicomToJpegTask($scope.query).then((res) => {
            if (res.data) {
                $scope.dicomToJpegTaskList = res.data.data;
                $scope.resultCount = res.data.count;
            }
        })
    });

});


dicomToJpegTaskApp.service('dicomToJpegTaskService' , function ($http) {
    return {
        getDicomToJpegTask: getDicomToJpegTask
    }
    function getDicomToJpegTask(qs) {
        let request = $http({
            method: "get",
            url: "/api/dicom/dicomToJpegTask",
            params: qs
        });
        return (request.then(handleSuccess, handleError));
    }

    function handleSuccess(res) {
        return res;
    }
    function handleError(err) {
        console.error(err);
        return err
    }
});