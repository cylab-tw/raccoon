var RegisterApp = angular.module("RegisterApp" , []);
RegisterApp.controller("RegisterCtrl" , function($scope, RegisterService)
{
    $scope.username = "";
    $scope.password = "";
    $scope.passwordConfirm = "" ; 
    $scope.email = "";
    $scope.firstname = "";
    $scope.lastname = "";
    $scope.gender = "";
    $scope.Havelastname = true;
    $scope.Register = function()
    {
        if ($scope.password != $scope.passwordConfirm) {
            $scope.isPasswordNotMatch = true;
            $('#passwordMatch').removeClass("inputError");
            $('#passwordMatch').addClass("inputError");
            return ;
        }
        RegisterService.Register($scope).then((res)=>
        {   
            if (res.status == 400) {
                let errorMessage = res.data.result;
                errorMessageFunc(errorMessage);
            }
            else if (res.data.account != undefined)
            {
                alert("註冊成功");
                window.location = "/";
                clearError();
            } else{
                alert("註冊失敗"); 
            }
        })
    }
    $scope.test = function()
    {
        $scope.Havelastname = ($scope.lastname == "") ? false : true;
        console.log($scope);
    }
    $scope.removeErrorOnFocus=  function (item) {
        let id = item.target.id;
        $(`#${id}`).removeClass("inputError");
    }
    function handleAccError ( message) {
        if (message.includes("acc")) {
            $scope.isAccError = true;
            $('#username').removeClass("inputError");
            $('#username').addClass("inputError");
        }
    }
    function handlePasswordError (message) {
        if (message.includes("pwd")) {
            $scope.isPasswordError = true;
            $('#password').removeClass("inputError");
            $('#password').addClass("inputError");
        }
    }
    function errorMessageFunc(message) {
        handleAccError(message) ;
        handlePasswordError(message);
    }
    function clearError () {
        $scope.isAccError = false;
        $scope.isPasswordError = false;
        $("input").removeClass("inputError");
    }
});
RegisterApp.service('RegisterService' , function($http)
{
    return(
        {
            Register : Register
        }
    )
    function Register($scope)
    {
        var request = $http(
        {
            method : "POST"  ,
            url : "/api/users",
            params:
            {
                acc : $scope.username , 
                pwd : $scope.password , 
                email : $scope.email , 
                fname : $scope.firstname ,
                lname : $scope.lastname  , 
                gender : $scope.gender , 
                usertype : 'normal' , 
                status : 0 
            }
        });
        return (request.then(handleSuccess , handleError));
    }
    function handleSuccess(response)
    {
        return response;
    }
    function handleError(response)
    {
        return response;
    }
});



