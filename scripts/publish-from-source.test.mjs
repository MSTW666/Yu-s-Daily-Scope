import assert from 'node:assert/strict';
import {checkEnvelope} from './publish-from-source.mjs';
const e={source:{threadId:'6ade2348-ceb4-83e8-9ac5-450d59896427',messageId:'test',complete:true,date:'2026-11-05',text:'11 月 5 日简报 https://example.com/'},briefing:{date:'2026-11-05',sourceNote:'来源说明',items:[{title:'测试',date_kind:'tbd',date_label:'日期待确认',source_url:'https://example.com/'}]}};
assert.equal(checkEnvelope(e,'2026-11-05').date,'2026-11-05');
assert.throws(()=>checkEnvelope(e,'2026-11-06'));
for(const mutate of [x=>x.source.complete=false,x=>x.source.text='日期不明',x=>x.briefing.items[0].source_url='https://other.example/',x=>x.source.threadId='wrong']){const x=structuredClone(e);mutate(x);assert.throws(()=>checkEnvelope(x,'2026-11-05'));}
console.log('PASS: valid source, stale date, incomplete source, missing date, foreign link and wrong source');
