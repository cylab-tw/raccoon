var HomePageApp = angular.module("HomePageApp", ["commonApp"]);
HomePageApp.controller("HomePageCtrl", async function ($scope, $location, $window, HomePageService , commonService ) {
  $scope.loggedUser = "";
  await commonService.user.init($scope);
  console.log($scope.loggedUser == "");
});

HomePageApp.service('HomePageService', function ($http, $q, $location) {
  return ({
    getProfile : getProfile
  });
  function getProfile () {
    let request = $http ({
      method : "get" , 
      url : "/api/profile"
    });
    return (request.then(handleSuccess , handleError));
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