#!/usr/bin/env python3
"""Build WikDict adapter v1. Preserve source objects; never infer source hash routing.
Usage: python build.py --input /folder/with/G版-zh-en-00.json --dictionary /site/dictionary --reports /reports
Requires Python 3.10+ and opencc-python-reimplemented==0.1.7 (build time only).
"""
import argparse,collections,hashlib,html,json,math,re,shutil,unicodedata
from pathlib import Path
from opencc import OpenCC
import opencc
import importlib.metadata
P=argparse.ArgumentParser();P.add_argument('--input',required=True);P.add_argument('--dictionary',required=True);P.add_argument('--reports',required=True);a=P.parse_args()
root=Path(a.input);out=Path(a.dictionary);reports=Path(a.reports);reports.mkdir(parents=True,exist_ok=True)
def dump(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf-8');return p.stat().st_size
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def strict_pairs(pairs):
 d={}
 for k,v in pairs:
  if k in d:raise ValueError('Duplicate JSON key: '+k)
  d[k]=v
 return d
def norm(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',s).strip()).lower()
def plain(s):return html.unescape(re.sub(r'<[^>]*>','',s))
def sortkey(s):return s.encode('utf-16-be','surrogatepass')
files=sorted(root.glob('G版-zh-en-*.json'));assert [p.name for p in files]==[f'G版-zh-en-{i:02}.json' for i in range(64)],'Need exactly shards 00–63'
records=[];sources=[];issues=[];ids=collections.defaultdict(list);words=collections.Counter()
for f in files:
 rows=json.loads(f.read_text(encoding='utf-8-sig'),object_pairs_hook=strict_pairs,parse_constant=lambda x:(_ for _ in ()).throw(ValueError(x)))
 assert isinstance(rows,list)
 sources.append({'file':f.name,'bytes':f.stat().st_size,'sha256':sha(f),'start':len(records),'count':len(rows)})
 for offset,r in enumerate(rows):
  assert set(r)=={'w','t','s','i','g','d'} and isinstance(r['w'],str) and isinstance(r['t'],str) and isinstance(r['d'],list),(f.name,offset)
  rid=len(records);words[r['w']]+=1
  for j,d in enumerate(r['d']):
   assert isinstance(d,dict)
   if d.get('id'):ids[d['id']].append([rid,j])
  flags=[]
  if not r['d']:flags.append('no_detailed_senses')
  if not r['g']:flags.append('source_is_good_false')
  if any(not d.get('pos') for d in r['d']):flags.append('empty_pos')
  if re.search(r'<[^>]+>|\{\{|\}\}',r['t']):flags.append('markup_in_translation')
  if flags:issues.append({'record_id':rid,'source':f.name,'row_0based':offset,'word':r['w'],'flags':flags})
  records.append(r)
version='20261125-'+hashlib.sha256(''.join(s['sha256'] for s in sources).encode()).hexdigest()[:12]
base=out/'data'/'wikdict-zh-en'/version;base.mkdir(parents=True,exist_ok=True)
chunk=256
for start in range(0,len(records),chunk):dump(base/'records'/f'{start//chunk:04}.json',records[start:start+chunk])
# Re-read all emitted objects, compare exact Python JSON values (no definition edits).
roundtrip=[]
for p in sorted((base/'records').glob('*.json')):roundtrip.extend(json.loads(p.read_text()))
assert roundtrip==records
ccs=OpenCC('t2s');cct=OpenCC('s2t');forward=collections.defaultdict(set);reverse=collections.defaultdict(set)
for rid,r in enumerate(records):
 for w in {r['w'],ccs.convert(r['w']),cct.convert(r['w'])}:
  if norm(w):forward[norm(w)].add(rid)
 for t in [r['t']]+[d.get('translation') for d in r['d']]:
  if not isinstance(t,str):continue
  for part in plain(t).split('|'):
   if norm(part):reverse[norm(part)].add(rid)
def rank(rid):
 r=records[rid];return (not bool(r['g']),-float(r['s'] or 0),-float(r['i'] or 0),rid)
def build_index(name,index):
 keys=sorted(index,key=sortkey);routes=[];batch=[];size=0
 def flush():
  nonlocal batch,size
  if not batch:return
  path=f'{name}/{len(routes):04}.json';n=dump(base/path,batch)
  routes.append({'first':batch[0][0],'last':batch[-1][0],'path':path,'bytes':n,'keys':len(batch)})
  batch=[];size=0
 for key in keys:
  row=[key,sorted(index[key],key=rank)];n=len(json.dumps(row,ensure_ascii=False).encode())
  if batch and (len(batch)>=256 or size+n>96000):flush()
  batch.append(row);size+=n
 flush()
 dump(base/f'{name}.json',{'normalization':'NFC + trim + whitespace collapse + lowercase; JS UTF-16 order','routes':routes,'keys':len(keys)})
 return {'keys':len(keys),'postings':sum(len(v) for v in index.values()),'pages':len(routes),'max_page_bytes':max(r['bytes'] for r in routes)}
fi=build_index('zh-en',forward);ri=build_index('en-zh',reverse)
senses=sum(len(r['d']) for r in records);duplicate_ids={k:v for k,v in ids.items() if len(v)>1}
meta={'id':'wikdict-zh-en','label':'WikDict 汉英 · Gemini 初步复核版','version':version,'upstream_snapshot':'未提供可核实的上游快照编号；不以目录日期充当上游版本','source':'https://www.wikdict.com/page/download','upstream_file':'https://download.wikdict.com/dictionaries/sqlite/2/zh-en.sqlite3','license':'CC BY-SA 4.0','license_url':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'WikDict by Karl Bartel; Wiktionary contributors; DBnary','modifications':'此前经 Gemini 辅助整理及初步复核；本轮仅生成索引、简繁检索别名与数据分片，未改动词条释义。','checked':'2026-11-25','records':len(records),'senses':senses,'chunk_size':chunk,'source_shards':sources,'forward':fi,'reverse':ri,'alias_tool':'opencc-python-reimplemented 0.1.7 (t2s/s2t, index only)'}
dump(base/'source.json',meta)
dump(out/'catalog.json',{'schema':1,'version':'2.0-batch01','local':[{'id':'wikdict-zh-en','base':f'data/wikdict-zh-en/{version}/','records':len(records),'chunk_size':chunk,'directions':['zh-en','en-zh']}],'directions':[{'id':'zh-en','label':'汉英 · 本地词库'},{'id':'en-zh','label':'英汉 · 汉英词库反查'},{'id':'en-en','label':'英英 · 在线词典'}],'pending':['ja-en','en-ja','ja-zh','zh-ja']})
license_dir=out/'licenses';license_dir.mkdir(exist_ok=True)
for name in ['LICENSE.txt','NOTICE.txt']:
 src=Path(opencc.__file__).parent/name
 if not src.exists():
  dist=importlib.metadata.distribution('opencc-python-reimplemented')
  matches=[dist.locate_file(f) for f in dist.files if str(f).endswith('/'+name)]
  if matches:src=matches[0]
 if src.exists():shutil.copy2(src,license_dir/('OpenCC-'+name))
manifest=[]
for p in sorted(base.rglob('*.json')):manifest.append({'path':str(p.relative_to(out)),'bytes':p.stat().st_size,'sha256':sha(p)})
dump(reports/'asset_manifest.json',manifest);dump(reports/'source_manifest.json',sources)
dump(reports/'technical_issues.json',{'scope':'机械结构检查；不是第二轮语言审校；全部保留','duplicate_sense_ids':duplicate_ids,'rows':issues})
summary={'records':len(records),'unique_headwords':len(words),'detailed_senses':senses,'records_with_senses':sum(bool(r['d']) for r in records),'records_without_senses':sum(not r['d'] for r in records),'good_source_true':sum(bool(r['g']) for r in records),'duplicate_headwords':sum(v-1 for v in words.values()),'duplicate_sense_id_groups':len(duplicate_ids),'duplicate_sense_id_excess':sum(len(v)-1 for v in duplicate_ids.values()),'duplicate_sense_id_affected_rows':len({p[0] for v in duplicate_ids.values() for p in v}),'max_headword_length':max(map(len,words)),'record_chunks':math.ceil(len(records)/chunk),'original_bytes':sum(s['bytes'] for s in sources),'deployed_data_bytes':sum(m['bytes'] for m in manifest),'largest_data_file':max(manifest,key=lambda m:m['bytes']),'forward':fi,'reverse':ri,'version':version,'roundtrip_equal':True,'source_shards':64,'missing_shards':[],'parse_errors':[],'field_counts':dict(collections.Counter(k for r in records for k in r)),'checks':{'all_forward_records_indexed':set().union(*forward.values())==set(range(len(records))),'all_reverse_references_in_range':all(0<=v<len(records) for vs in reverse.values() for v in vs)}}
dump(reports/'data_summary.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
