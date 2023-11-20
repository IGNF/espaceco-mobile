/** Gulp file to create the project documentation
*/
var gulp = require("gulp");
var jsdoc = require('gulp-jsdoc3');

/** Build the doc */
gulp.task('doc', function (cb) {
    var config = require('./jsdoc.json');
    gulp.src([
		"./doc/readme.md", "./doc/*.js", 
		"./src/wapp.js",
		"./src/guichet/*.js",
		"./src/report/*.js",
		"./src/map/*.js",
	], {read: false})
        .pipe(jsdoc(config, cb));
});

// The default task that will be run if no task is supplied
gulp.task("default", gulp.series("doc"));
