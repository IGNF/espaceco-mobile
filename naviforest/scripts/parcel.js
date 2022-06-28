
/**
 * Launch npm build command
 * use --dev to launch the build-dev command
 */
module.exports = function(context) {
  console.log('!!Before build parcel', context.cmdLine)

  const fse = require('fs-extra');

  
  srcDir = './naviforest/src';
  destDir = './src';
                                
  // To copy a folder or file  
  fse.copySync(srcDir, destDir, { overwrite: true }, function (err) {
    if (err) {                 
      console.error(err);      
    } else {
      console.log("success!");
    }
  });

 
  

  var exec = require('child_process').execSync;
  var cmd = 'npm run build';
  if (/--dev/.test(context.cmdLine)) cmd += '-dev';
  exec(cmd, {stdio: 'inherit'});
  console.log();


 
}