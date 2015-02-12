"use strict";
var fs = require("fs");
var path = require("path");

module.exports = function (options, Handlebars) {
    return {
        init: function () {
            Handlebars.registerPartial("header", fs.readFileSync([__dirname, "partials", "header.hbt"].join(path.sep)).toString());
            Handlebars.registerPartial("footer", fs.readFileSync([__dirname, "partials", "footer.hbt"].join(path.sep)).toString());
            Handlebars.registerHelper("formatDate", function(date, lang){
                var date = new Date(date);

                if (lang) {
                    return date.getFullYear()+"年 "+(date.getMonth()+1)+"月 "+date.getDate()+"日";
                }else {
                    var month = ["January", "Febuary", "March", "April", "May", "June",
                                 "July", "August", "September", "October", "November", "December"];

                    return month[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();        
                }
            });
        },

        apply: function (context) {
            context.short_title = path.basename(options.input, ".md");

            if (context.template === undefined) {
                switch (path.basename(path.dirname(options.input))) {
                    case "pages":
                        context.template = "page.hbt";
                        break;
                    case "posts":
                        context.template = "post.hbt";
                        break;
                    default:
                        console.log("template not found for", options.input);
                        process.exit(-1);
                }
            }

            var template = Handlebars.compile(fs.readFileSync([__dirname, context.template].join(path.sep)).toString());
            return template(context);
        }
    }
};
