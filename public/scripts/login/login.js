let loginApp = angular.module("loginApp", []);
loginApp.controller("loginCtrl", function ($scope, $q,loginService) {

    $scope.localLogin = function () {
        loginService.localLogin($scope).then(function(res) {
            let data = res.data;
            if (res.status === 200) {
                storeToken(data);
                location.reload();
            } else {
                let pError = document.getElementById("pError");
                pError.style.display = "block";
                pError.innerText = data.message;
            }
        });
    }

});
loginApp.service('loginService', function ($http) {
    return (
        {
            localLogin : localLogin
        }
    )

    function localLogin($scope) {
        let request = $http({
            method: "POST",
            url: "/login",
            params: {
                username: $scope.username,
                password: $scope.password
            }
        });

        return request.then(handleSuccess, handleError);
    }

    function handleSuccess(response) {
        return response;
    }
    function handleError(response) {
        return response;
    }
});


function storeToken(data) {
    if (data["token"]) {
        localStorage.setItem("raccoon_token", data["token"]);
    }
}
