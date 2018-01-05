/** Gulp file to create the project documentation
*/
var gulp = require("gulp");
var jsdoc = require('gulp-jsdoc3');

/** Build the doc */
gulp.task('doc', function (cb) {
    var config = require('./jsdoc.json');
    gulp.src([
		"./doc/readme.md", "./doc/*.js", 
		"./www/js/wapp/*.js",
		"./www/js/guichet.js",
		"./www/js/wapp.guichet.js",
		"./www/js/wapp.ripart.js",
		"./www/js/ripart.js"
	], {read: false})
        .pipe(jsdoc(config, cb));
});

// The default task that will be run if no task is supplied
gulp.task("default", ["doc"]);
