$ = require("jquery");

function on_resize()
{
    if ($(this).width() > 500) {
        $("header nav").show();
    }else{
        $("header nav").hide(); 
    }
}

window.auto_reload = function ()
{
    var ws = new WebSocket("ws://127.0.0.1:56789");
    ws.onmessage = function(e) {
        var ext = e.data.substr(-3);
        if (ext === "css" || ext === "hbt" || ext === ".js") {
            window.location.reload();
        } else {
            $.ajax({url: window.location.toString(), cache:false}).done(function(data){
                $("article")[0].innerHTML = $(data).filter("article")[0].innerHTML;
            });
        }
    }
}

$(function(){
    $(".menu-icon").click(function(){
        $("header nav").slideToggle(200);
    });

    window.addEventListener("resize", on_resize);
});
