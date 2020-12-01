

var UserManagerApp = angular.module("UserManagerApp", [ 'ui.bootstrap', 'commonApp']);
UserManagerApp.controller("UserManagerCtrl", function ($scope, $location, $window, UserManagerService , commonService) {
  $scope.loggedUser = "";
  init();
  commonService.user.init($scope);
  $scope.resultPerPage = 10;
  $scope.resultCurPage = 1;
  $scope.resultCount = 0;
  function init() {
    UserManagerService.Load_Users($scope).then(function (res) {
      console.log(res.data);
      if (res.data == "") {
        $scope.DataListSize = 0;
        $scope.DataList = [];
      } else {
        $scope['DataList'] = res.data.result;
        $scope.DataListSize = $scope.DataList.length;
        $scope.resultCount = res.data.count;
      }
    }).then(function (res) { });
  };

  $scope.Approve_User = function (ID) {
    UserManagerService.Approve_User(ID).then(function (res) {
      init();
    }).then(function (res) { });
  };
  $scope.Block_User = function (ID) {
    UserManagerService.Block_User(ID).then(function (res) {
      init();
    }).then(function (res) { });
  };
  $scope.Delete_User = function (ID) {
    if(confirm("確定要刪除此使用者？")){
      UserManagerService.Delete_User(ID).then(function (res) {
        alert("刪除成功");
        init();
      }).then(function (res) { });
    }    
  };
  $scope.$watch("resultCurPage" , function (oldValue , newValue) {
    UserManagerService.Load_Users($scope).then(function (res) {
        $scope['DataList'] = res.data.result;
        $scope.DataListSize = $scope.DataList.length;
        $scope.resultCount = res.data.count;
    });
  });
});

UserManagerApp.service('UserManagerService', function ($http, $q, $location) {
  return ({
    Load_Users: Load_Users,
    Approve_User: Approve_User,
    Block_User: Block_User,
    Delete_User: Delete_User
  });

  function Load_Users($scope) {
    var request = $http({
      method: "get",
      url: "/api/users/" , 
      params : {
        _count : $scope.resultPerPage , 
        _offset : $scope.resultPerPage * ($scope.resultCurPage-1)
      }
    });
    return (request.then(handleSuccess, handleError));
  }

  function Approve_User(ID) {
    var request = $http({
      method: "put",
      url: "/api/users/" + ID,
      data: {
        status: 1
      }
    });
    return (request.then(handleSuccess, handleError));
  }

  function Block_User(ID) {
    var request = $http({
      method: "put",
      url: "/api/users/" + ID,
      data: {
        status: 0
      }
    });
    return (request.then(handleSuccess, handleError));
  }

  function Delete_User(ID) {
    var request = $http({
      method: "delete",
      url: "/api/users/" + ID      
    });
    return (request.then(handleSuccess, handleError));
  }

  function handleSuccess(response) {
    console.log(response);
    return (response);
  }

  function handleError(response) {
    if (!angular.isObject(response.data) || !response.data.message) {
      return ($q.reject("An unknown error occured."));
    } else {
      return ($q.reject(response.data.message));
    }
  }
});