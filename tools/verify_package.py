#!/usr/bin/env python3
"""Verify distributed data against reports/asset_manifest.json, validate links and record count."""
from pathlib import Path
import hashlib,json,sys
from html.parser import HTMLParser
root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve();d=root/'dictionary'
manifest=json.loads((root/'reports/asset_manifest.json').read_text());count=0
for m in manifest:
 p=d/m['path'];assert p.is_file(),p
 b=p.read_bytes();assert len(b)==m['bytes'],p;assert hashlib.sha256(b).hexdigest()==m['sha256'],p
 data=json.loads(b)
 if '/records/' in m['path']:count+=len(data)
assert count==136854,count
cat=json.loads((d/'catalog.json').read_text());assert cat['local'][0]['records']==count
assert (d/'licenses/OpenCC-LICENSE.txt').is_file()
assert (d/'licenses/OpenCC-NOTICE.txt').is_file()
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,t,attrs):
  self.urls.extend(v for k,v in attrs if k in ('src','href') and v)
n=0
for p in d.glob('*.html'):
 x=Links();x.feed(p.read_text())
 for u in x.urls:
  if u.startswith(('http:','https:','data:','#','../')):continue
  path=(p.parent/u.split('?')[0].split('#')[0]).resolve();assert path.is_relative_to(d);assert path.exists(),(p,u);n+=1
assert not list(d.rglob('qa-*'))
print(json.dumps({'data_files_verified':len(manifest),'records':count,'local_dictionary_links':n,'licenses_present':True,'pass':True}))
