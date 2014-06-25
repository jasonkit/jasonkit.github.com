$(function(){
    var title_img = $("article").data("title-img");
    $(".article_header").css("background-image", "url(../../images/"+title_img+")");

    $(".menu-icon").click(function(){
        $("header nav").slideToggle(200);
    });
});
