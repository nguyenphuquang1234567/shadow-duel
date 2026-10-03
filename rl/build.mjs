import {build} from 'esbuild';
await build({entryPoints:['rl/server.ts'],bundle:true,platform:'node',format:'esm',outfile:'rl/dist/server.mjs'});

await build({entryPoints:["src/rl.ts"],bundle:true,platform:"node",format:"esm",outfile:"rl/dist/policy.mjs"});
