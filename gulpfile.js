var gulp = require('gulp');
var clean = require('gulp-clean');
var ts = require('gulp-typescript');
var runSequence = require('run-sequence');
const mocha = require('gulp-mocha');

var tsProject = ts.createProject('src/tsconfig.json');

gulp.task('clean', function() {
  return gulp.src(['build'], {read: false})
        .pipe(clean());
});

gulp.task('ts', function () {
    return tsProject.src()
      .pipe(tsProject())
      .pipe(gulp.dest('build/'));
});

gulp.task('default', function(callback) {
  runSequence(
    'clean',
    'ts',
    callback);
});

gulp.task('test', ['default'], function(callback) {
  return gulp.src(['build/tests/*.js'], {read: false})
        .pipe(mocha({
            reporter: 'nyan'
        }));
});
