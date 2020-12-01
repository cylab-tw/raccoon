let lastOptionName = "Image";
$(".dropdown-item").click(function(){
    let scope = angular.element($('body')).scope();
    let Checkedlen = $(".checked").length ;
    let name = $(this).children("span").html();
    if (Checkedlen == 1) {
        if (lastOptionName == name) {
            return;
        }
        $(".dropdown-item .check-box").removeClass("checked");
    } 
    lastOptionName = name;
    $(this).children("div").toggleClass("checked");
    scope.setVal('viewAndSearchMode' , name);
    $('#viewAndSearchMode').val(name);
    $("#search_bar .input-group-prepend button").html(name);
    /*let hasAll = $("a.all > div").hasClass("checked");
    let sum = $("a .check-box").length;
    let total = $("a:not(.all) .checked").length;
    if($(this).hasClass("all")){//all btn
        if(hasAll){
            $(".dropdown-item .check-box").addClass("checked");
        }
    }else{//other btn
        $(".dropdown-item.all .check-box").removeClass("checked");    
    }

    //最後確認
    if(total == (sum-1)){
        $(".dropdown-item .check-box").addClass("checked");
        $("#search_bar .input-group-prepend button").html("All");
    }else{
        let name = $(".check-box.checked").parent("a").children("span").html();
        $("#search_bar .input-group-prepend button").html(name);
    }*/
});