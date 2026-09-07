import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{stdio:'inherit',windowsHide:true,env:{...process.env,GOPLAN_LIVE_TESTS:'1'}});
child.on('exit',code=>{process.exitCode=code??1;});
