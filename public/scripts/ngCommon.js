//http://jsfiddle.net/pvtpenguin/k9KM7/3/


let commonApp = angular.module("commonApp" , []);

commonApp.service ("commonService" , function ($http , $rootScope , $window) {
    $window.rootScopes = $window.rootScopes || [];
    $window.rootScopes.push($rootScope);
    
    if ($window.sharedService) {
        return $window.sharedService;
    }
    $window.sharedService = {
        user: {
            getProfile : function () {
                let request = $http({
                    method : "get" , 
                    url : "/api/profile"
                });
                return (request.then(handleSuccess , handleError))
            } ,
            init : async ($scope) => {
                return new Promise ((resolve)=> {
                    $window.sharedService.user.getProfile().then(function (res) { 
                        $scope.loggedUser = res.data;
                        resolve(true);
                    });
                });
            }
        }, 
        FHIR : {
           getPatient : function () {
                let request = $http ({
                    method : "get" , 
                    url : "/api/fhir/Patient"
                });
                return (request.then(handleSuccess , handleError));
            }
        } , 
        es : {
            getReportSuggestion : function (keyword) {
                let request = $http({
                    method : "GET" ,
                    url :"/SE/search/report/suggestion/my-report" , 
                    params : {
                        ss : keyword , 
                        field : "Records.FULLTEXT"
                    }
                });
                return (request.then(handleSuccess , handleError));
            }
        }
    }
    return $window.sharedService;
    function handleSuccess(response) {
        //console.log(response);
        return (response);
    }
    
    function handleError(response) {
        if (!response.data) {
            return ($q.reject("An unknown error occured."));
        } else {
            return ($q.reject(response.data.message));
        }
    }
});
