const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(path.join(dir,f.name)):f.name.endsWith('.js')?[path.join(dir,f.name)]:[]);}
let failed=0;const all=[...files(path.resolve(__dirname,'..')),...files(path.resolve(__dirname,'../../test')),...files(path.resolve(__dirname,'../../../frontend/js')),...files(path.resolve(__dirname,'../../../database'))];
for (const file of all) {const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if (result.status!==0) {console.error(result.stderr);failed++;}}
console.log(`${all.length} JavaScript files checked; ${failed} syntax failures.`);process.exitCode=failed?1:0;
