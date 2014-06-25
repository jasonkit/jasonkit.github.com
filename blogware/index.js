var Metalsmith  = require("metalsmith"),
    markdown    = require("metalsmith-markdown"),
    templates   = require("metalsmith-templates"),
    collections = require("metalsmith-collections"),
    permalinks  = require("metalsmith-permalinks"),
    sass        = require("metalsmith-sass"),
    Handlebars  = require("handlebars"),
    fs          = require("fs");
   
Handlebars.registerPartial("header", fs.readFileSync(__dirname + "/templates/partials/header.hbt").toString());
Handlebars.registerPartial("footer", fs.readFileSync(__dirname + "/templates/partials/footer.hbt").toString());

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

Metalsmith(__dirname)
    .use(collections({
        pages: {
            pattern: "content/pages/*.md"
        },
        posts: {
            pattern: "content/posts/*.md",
            sortBy: "date",
            reverse: true
        }
    }))
    .use(markdown())
    .use(permalinks({
        pattern: ":collection/:short_title"
    }))
    .use(templates("handlebars"))
    .use(sass({outputStyle: "expanded"}))
    .destination("./build")
    .build()
