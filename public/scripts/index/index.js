

let indexApp = angular.module('indexApp' , ['commonApp']);
indexApp.controller('indexCtrl' , function($scope , commonService) {
    Micala.createMyAutoComplete(commonService);
    $scope.viewAndSearchMode = "Image";
    $scope.loggedUser = "";
    commonService.user.init($scope);
    $scope.setVal = function (element , val) {
        $scope[element] = val ;
    }
    console.log(localStorage.getItem("MicalaToken"));
});
