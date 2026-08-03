const LIGHT = ["https://bsc-dataseed1.bnbchain.org","https://bsc-rpc.publicnode.com"];
const LOGS = "https://bsc.drpc.org";
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const ADDR = "0x55951c1a7d61402c6731bc029959a173b741031d";
const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const toTopic = "0x000000000000000000000000" + ADDR.slice(2);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function rpc(url,m,p){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:m,params:p})});const j=await r.json();if(j.error)throw new Error(j.error.message);return j.result;}
async function light(m,p){for(const u of LIGHT){try{return await rpc(u,m,p);}catch{}}throw new Error("light fail");}
// current balance
const bal = await light("eth_call",[{to:USDT,data:"0x70a08231000000000000000000000000"+ADDR.slice(2)},"latest"]);
console.log("current USDT balance:", Number(BigInt(bal))/1e18);
// scan last ~5 days incoming
const latest = parseInt(await light("eth_blockNumber",[]),16);
const bt = async n => parseInt((await light("eth_getBlockByNumber",["0x"+n.toString(16),false])).timestamp,16)*1000;
const latestTs = await bt(latest), pTs = await bt(latest-200000);
const mpb=(latestTs-pTs)/200000, span=Math.ceil(5*86400000/mpb);
const logs=[];
for(let f=latest-span; f<=latest; f+=10000){const to=Math.min(f+9999,latest);for(let a=0;a<5;a++){try{const r=await rpc(LOGS,"eth_getLogs",[{fromBlock:"0x"+f.toString(16),toBlock:"0x"+to.toString(16),address:USDT,topics:[T,null,toTopic]}]);logs.push(...r);break;}catch{await sleep(500*(a+1));}}await sleep(120);}
console.log("incoming USDT transfers (last ~5 days):", logs.length);
for(const l of logs){let ts="?";try{ts=new Date(await bt(parseInt(l.blockNumber,16))).toISOString();}catch{}console.log(`  ${ts}  from 0x${l.topics[1].slice(26)}  ${Number(BigInt(l.data))/1e18} USDT  ${l.transactionHash}`);}
