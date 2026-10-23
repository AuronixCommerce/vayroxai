import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {GUEST_MESSAGE_LIMIT,GUEST_WINDOW_MS,issueGuestToken,verifyGuestToken,clearLegacyGuestChats,reserveGuestSQL,reserveGuestArguments,releaseGuestSQL} from '../lib/guest-policy.ts';
import {inferenceRequest} from '../lib/inference.ts';
test('guest allowance cookies reject tampering and another signing secret',async()=>{const token=await issueGuestToken('test-secret');assert.equal(await verifyGuestToken(token,'test-secret'),true);assert.equal(await verifyGuestToken(token,'another-secret'),false);assert.equal(await verifyGuestToken(token.slice(0,-1)+(token.endsWith('a')?'b':'a'),'test-secret'),false);assert.equal(await verifyGuestToken('invented','test-secret'),false);});
test('legacy guest chats are removed without writing any conversation data',()=>{const removed=[];clearLegacyGuestChats({removeItem:key=>removed.push(key)});assert.deepEqual(removed,['harium-guest-workspace-v1']);});
test('real SQLite counters allow exactly 14 concurrent requests and reset after four hours',()=>{const now=1800000000000;const input={schema:readFileSync(new URL('../drizzle/0004_keen_alex_power.sql',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../drizzle/0005_curved_shadowcat.sql',import.meta.url),'utf8'),sql:reserveGuestSQL,release:releaseGuestSQL,args:reserveGuestArguments('visitor',now),expired:reserveGuestArguments('visitor',now+GUEST_WINDOW_MS),limit:GUEST_MESSAGE_LIMIT,now,period:GUEST_WINDOW_MS};const script=`
import json,sqlite3,sys,tempfile,concurrent.futures,os
v=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as d:
 p=os.path.join(d,'quota.sqlite'); c=sqlite3.connect(p); c.executescript(v['schema']); c.commit();c.close()
 def reserve(_):
  db=sqlite3.connect(p,timeout=10);row=db.execute(v['sql'],v['args']).fetchone();db.commit();db.close();return row
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool: rows=list(pool.map(reserve,range(40)))
 assert len([r for r in rows if r])==14,rows
 db=sqlite3.connect(p);assert db.execute('SELECT used FROM guest_allowances').fetchone()[0]==14
 assert db.execute(v['sql'],v['args']).fetchone() is None
 reset=db.execute(v['sql'],v['expired']).fetchone();assert reset==(1,v['now']+2*v['period']),reset
 db.execute(v['release'],[v['now']+v['period'],'visitor',v['now']+v['period']]);assert db.execute('SELECT used FROM guest_allowances').fetchone()[0]==1
 db.execute(v['release'],[v['now']+v['period'],'visitor',reset[1]]);assert db.execute('SELECT used FROM guest_allowances').fetchone()[0]==0
 print('ok')
`;const result=spawnSync('python3',['-c',script],{input:JSON.stringify(input),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/ok/);});
test('company introductions are branded and avoid invented ownership claims',()=>{const request=inferenceRequest('code',[{role:'user',content:'Who are you?'}]);const system=request.messages[0].content;assert.match(system,/Vayrox AI, powered by Chohan Gen AI/);assert.match(system,/Do not invent company facts/);assert.match(system,/Never claim that Chohan Gen AI trained/);assert.equal(system.includes('provider Groq; model'),false);});
