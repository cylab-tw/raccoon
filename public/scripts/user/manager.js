var userManagerApp = angular.module("UserManagerApp", [ 
  'ui.bootstrap', 
  'commonApp',
  "pascalprecht.translate",
  "ngCookies"
]);

userManagerApp.config([
    "$translateProvider",
    function ($translateProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix: "/i18n/",
            suffix: ".json"
        });

        // Tell the module what language to use by default
        $translateProvider.preferredLanguage("en_US");

        // Tell the module to store the language in the local storage
        $translateProvider.useLocalStorage();
    }
]);

userManagerApp.controller(
    "UserManagerCtrl",
    function (
        $scope,
        $translate,
        $location,
        $window,
        UserManagerService,
        commonService
    ) {
        $scope.loggedUser = "";
        init();
        $scope.resultPerPage = 10;
        $scope.resultCurPage = 1;
        $scope.resultCount = 0;

        $scope.setLang = function (lang) {
            $translate.use(lang);
        };
        function init() {
            if (envConfig.login.jwt) raccoon.tokenLogin();

            UserManagerService.Load_Users($scope)
                .then(function (res) {
                    if (res.data == "") {
                        $scope.DataListSize = 0;
                        $scope.DataList = [];
                    } else {
                        $scope["DataList"] = res.data.result;
                        $scope.DataListSize = $scope.DataList.length;
                        $scope.resultCount = res.data.count;
                    }
                })
                .then(function (res) {});
        }

        $scope.Approve_User = function (ID) {
            UserManagerService.Approve_User(ID)
                .then(function (res) {
                    init();
                })
                .then(function (res) {});
        };
        $scope.Block_User = function (ID) {
            UserManagerService.Block_User(ID)
                .then(function (res) {
                    init();
                })
                .then(function (res) {});
        };
        $scope.Delete_User = async function (ID) {
            let confirmToDeleteTranslation = await $translate(
                "userMS.CONFIRM_TO_DELETE_USER"
            );
            let deleteTranslation = await $translate("DELETE");
            let successfulTranslation = await $translate("SUCCESSFUL");
            if (confirm(confirmToDeleteTranslation)) {
                UserManagerService.Delete_User(ID)
                    .then(function (res) {
                        alert(deleteTranslation+ successfulTranslation);
                        init();
                    })
                    .then(function (res) {});
            }
        };
        $scope.$watch("resultCurPage", function (oldValue, newValue) {
            UserManagerService.Load_Users($scope).then(function (res) {
                $scope["DataList"] = res.data.result;
                $scope.DataListSize = $scope.DataList.length;
                $scope.resultCount = res.data.count;
            });
        });
    }
);

userManagerApp.service("UserManagerService", function ($http, $q, $location) {
    return {
        Load_Users: Load_Users,
        Approve_User: Approve_User,
        Block_User: Block_User,
        Delete_User: Delete_User
    };

    function Load_Users($scope) {
        let token = localStorage.getItem("raccoon_token");
        var request = $http({
            method: "get",
            url: "/api/users/",
            params: {
                _count: $scope.resultPerPage,
                _offset: $scope.resultPerPage * ($scope.resultCurPage - 1)
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return request.then(handleSuccess, handleError);
    }

    function Approve_User(ID) {
        var request = $http({
            method: "put",
            url: "/api/users/" + ID,
            data: {
                status: 1
            }
        });
        return request.then(handleSuccess, handleError);
    }

    function Block_User(ID) {
        var request = $http({
            method: "put",
            url: "/api/users/" + ID,
            data: {
                status: 0
            }
        });
        return request.then(handleSuccess, handleError);
    }

    function Delete_User(ID) {
        var request = $http({
            method: "delete",
            url: "/api/users/" + ID
        });
        return request.then(handleSuccess, handleError);
    }

    function handleSuccess(response) {
        return response;
    }

    function handleError(response) {
        if (!angular.isObject(response.data) || !response.data.message) {
            return $q.reject("An unknown error occured.");
        } else {
            return $q.reject(response.data.message);
        }
    }
});