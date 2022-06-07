let loginApp = angular.module("loginApp", []);
loginApp.controller("loginCtrl", function ($scope, $q,loginService) {
    $scope.login = function () {
        loginService.getToken($scope).then(function (res) {
            let data = res.data;
            if (data.token) {
                localStorage.setItem('MicalaToken' , data.token);
                loginService.login($scope).then(function (res) {
                    location.reload();
                });
            } else {
                let pError = document.getElementById('pError');
                pError.style.display = 'block';
                pError.innerText = data.message;
            }
        });
    }

    $scope.localLogin = function () {
        loginService.localLogin($scope).then(function(res) {
            let data = res.data;
            if (res.status === 200) {
                location.reload();
            } else {
                console.log(res);
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
            getToken : getToken , 
            localLogin : localLogin
        }
    )
    function getToken($scope) {
        var request = $http(
            {
                method: "POST",
                url: "/loging/getAccessToken",
                params: {
                    username : $scope.username  , 
                    password : $scope.password
                }
            });
        return (request.then(handleSuccess, handleError));
    }

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



