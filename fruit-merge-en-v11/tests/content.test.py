from pathlib import Path
from html.parser import HTMLParser
import json,re,html
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,text):super().__init__();self.h1=0;self.ids=[];self.links=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if 'id'in a:self.ids.append(a['id'])
  for key in ['href','src']:
   if key in a:self.links.append(a[key])
count=0
for name in ['index.html','site/index.html','Fruit-Merge-Game-English.html']:
 text=(ROOT/name).read_text();page=Page(text)
 assert page.h1==1 and len(page.ids)==len(set(page.ids));count+=1
 assert '<title>Fruit Merge Game – Play Free Online, No Download or Sign-Up</title>'in text;count+=1
 blobs=re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S)
 assert len(blobs)==2
 schemas=[json.loads(b)for b in blobs]
 assert all(s['@context']=='https://schema.org'for s in schemas);count+=1
 for qa in schemas[0]['mainEntity']:
  assert html.escape(qa['name'])in text and html.escape(qa['acceptedAnswer']['text'])in text
 count+=1
 assert 'Bananas → Mangosteen'not in text and '25 fruits'in text
 assert 'Set before your first drop.'not in text;count+=1
for slug in ['fruit-merge-game-strategy','fruit-merge-game-unblocked']:
 child=(ROOT/'site'/slug/'index.html').read_text()
 assert Page(child).h1==1 and child.count('href="/"')>=2
 assert 'href="/'+slug+'/"'in (ROOT/'site/index.html').read_text();count+=1
for path in [ROOT/'index.html',ROOT/'site/index.html',ROOT/'Fruit-Merge-Game-English.html',*(ROOT/s/'index.html'for s in ['fruit-merge-game-strategy','fruit-merge-game-unblocked']),*(ROOT/'site'/s/'index.html'for s in ['fruit-merge-game-strategy','fruit-merge-game-unblocked'])]:
 for link in Page(path.read_text()).links:
  if link.startswith(('data:','#','https:')):continue
  target=(ROOT/'site'/link.lstrip('/'))if link.startswith('/')else path.parent/link
  if link.endswith('/'):target=target/'index.html'
  assert target.exists(),(path,link)
 count+=1
print(str(count)+' content / structured-data / link checks passed')
