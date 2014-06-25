var g_title_img_ar = null;
var g_title_img_height = null;
function render_title_image() {
    var url = $(".article_header").data("title-img");

    if (url.substr(0,4) != "http") {
        url = "../../images/" + url;
    }

    var img = new Image();
    img.addEventListener("load", function(){
        g_title_img_ar = (img.height / img.width);
        $(".article_header").css({
            "padding-top"       : (g_title_img_ar*100) + "%",
            "background-image"  : "url("+url+")"
        });
        on_resize();
    });

    img.src = url;
}

function on_resize()
{
    if ($(this).width() > 500) {
        $("header nav").show();

        $(".article_header").css({
            "padding-top": (g_title_img_ar*100) + "%",
            "background-size": "100%"
        });
        
        g_title_img_height = $(".article_header").width() * g_title_img_ar;
    }else{
        $("header nav").hide(); 
        $(".article_header").css({
            "padding-top": "400px",
            "background-size": "auto 100%"
        });
    }

    on_scroll();
};

function on_scroll()
{
    console.log($(this).width())
    if ($(this).width() > 500) {
        var effective_height = g_title_img_height - window.pageYOffset;
        $(".article_header_content").css("bottom", effective_height/4);
    }else{
        $(".article_header_content").css("bottom", "0px");
    }
}

$(function(){

    render_title_image();

    $(".menu-icon").click(function(){
        $("header nav").slideToggle(200);
    });

    window.addEventListener("resize", on_resize);
    window.addEventListener("scroll", on_scroll);
});
