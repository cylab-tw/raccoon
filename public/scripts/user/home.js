let homePageApp = angular.module("HomePageApp", [
    "pascalprecht.translate",
    "ngCookies",
    "commonApp"
]);

homePageApp.config(["$translateProvider", function ($translateProvider) {
    $translateProvider.useStaticFilesLoader({
        prefix: "/i18n/",
        suffix: ".json"
    });

    // Tell the module what language to use by default
    $translateProvider.preferredLanguage("en_US");

    // Tell the module to store the language in the local storage
    $translateProvider.useLocalStorage();
}]);


homePageApp.controller("HomePageCtrl", 
    async function (
        $scope,
        $translate,
        HomePageService,
        commonService
    ) {
        $scope.setLang = function (lang) {
            $translate.use(lang);
        };

        $scope.loggedUser = "";
        await commonService.user.init($scope);
        console.log($scope.loggedUser == "");
    }
);

homePageApp.service("HomePageService", function ($http, $q, $location) {
    return {
        getProfile: getProfile
    };
    function getProfile() {
        let request = $http({
            method: "get",
            url: "/api/profile"
        });
        return request.then(handleSuccess, handleError);
    }

    function handleSuccess(response) {
        console.log(response);
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