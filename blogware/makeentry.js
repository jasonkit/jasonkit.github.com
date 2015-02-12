"use strict";
var MarkedMetaData = require("marked-metadata-with-options");
var Handlebars = require("Handlebars");
var getopt = require("node-getopt");
var fs = require("fs");
var path = require("path");

// setup Handlebars
var template_path = "templates";
Handlebars.registerPartial("header", fs.readFileSync([__dirname,template_path,"partials","header.hbt"].join(path.sep)).toString());
Handlebars.registerPartial("footer", fs.readFileSync([__dirname,template_path,"partials","footer.hbt"].join(path.sep)).toString());
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

var options = getopt.create([
        ["i", "input=ARG",  "input markdown file."],
        ["o", "output=ARG", "output html file."],
        ["h", "help",       "display this help."]
        ]).bindHelp().parseSystem().options;

var md = new MarkedMetaData(options.input);
md.defineTokens("---", "---");

try {
    var context = md.metadata();
    context.contents = md.markdown();
} catch(err) {
    console.log("Bad markdown file or metadata: ", options.input); 
    process.exit(-1);
}

context.short_title = path.basename(options.input, ".md");

var template = Handlebars.compile(fs.readFileSync([__dirname,template_path,context.template].join(path.sep)).toString());
var html = template(context);
try {
    fs.mkdirSync(path.dirname(options.output));
    fs.writeFileSync(options.output, html);
}catch(err) {
    console.log("Cannot write output to", options.output);
    process.exit(-1);
}
