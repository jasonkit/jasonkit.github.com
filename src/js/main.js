function on_resize()
{
    if ($(this).width() > 500) {
        $("header nav").show();
    }else{
        $("header nav").hide(); 
    }
};

$(function(){
    $(".menu-icon").click(function(){
        $("header nav").slideToggle(200);
    });

    window.addEventListener("resize", on_resize);
});
