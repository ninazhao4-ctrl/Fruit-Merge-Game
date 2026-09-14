"""Build editable sources into offline previews and a static publish directory.
python3 build.py — no third-party dependencies or network calls.
"""
from pathlib import Path
import base64, json, html, shutil, re
ROOT=Path(__file__).resolve().parent
faq=json.loads((ROOT/'content/faq.en.json').read_text())
steps=json.loads((ROOT/'content/howto.en.json').read_text())
article=(ROOT/'content/article.en.html').read_text()
faq_html='\n'.join('<h3>'+html.escape(item['question'])+'</h3><p>'+html.escape(item['answer'])+'</p>' for item in faq)
article=article.replace('<!-- FAQ_CONTENT -->',faq_html)
schemas=[{'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':i['question'],'acceptedAnswer':{'@type':'Answer','text':i['answer']}}for i in faq]}, {'@context':'https://schema.org','@type':'HowTo','name':'How to Play Fruit Merge Game','step':[{'@type':'HowToStep',**i} for i in steps]}]
markup='\n'.join('<script type="application/ld+json">'+json.dumps(s,ensure_ascii=False).replace('<','\\u003c')+'</script>'for s in schemas)
page=(ROOT/'index.template.html').read_text().replace('<!-- ARTICLE_CONTENT -->',article).replace('</head>',markup+'</head>')
children={'fruit-merge-game-strategy':('Fruit Merge Game Strategy Guide','strategy.en.html'),'fruit-merge-game-unblocked':('Fruit Merge Game Unblocked','unblocked.en.html')}
site=ROOT/'site';site.mkdir(exist_ok=True)
(site/'index.html').write_text(page)
for name in ['style.css','fruits.js','engine.js','leaderboard.js','audio.js','share.js','game.js']:shutil.copyfile(ROOT/name,site/name)
shutil.copytree(ROOT/'assets',site/'assets',dirs_exist_ok=True)
shutil.copytree(ROOT/'rankings',site/'rankings',dirs_exist_ok=True)
def child_page(title,body,css):
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><meta name="description" content="'+html.escape(title)+': controls, fruit merging and practical guidance for this browser game."><link rel="stylesheet" href="'+css+'"></head><body><main class="app"><article class="article">'+body+'</article></main></body></html>'
for slug,(title,file)in children.items():
 body=(ROOT/'content'/file).read_text()
 (site/slug).mkdir(exist_ok=True);(ROOT/slug).mkdir(exist_ok=True)
 (site/slug/'index.html').write_text(child_page(title,body,'/style.css'))
 (ROOT/slug/'index.html').write_text(child_page(title,body.replace('href="/"','href="../index.html"'),'../style.css'))
# Local source preview has file-safe relative internal links.
local=page
for slug in children:local=local.replace('href="/'+slug+'/"','href="'+slug+'/index.html"')
(ROOT/'index.html').write_text(local)
standalone=page.replace('<link rel="stylesheet" href="style.css">','<style>\n'+(ROOT/'style.css').read_text()+'\n</style>')
for name in ['fruits.js','engine.js','leaderboard.js','audio.js','share.js','game.js']:
 standalone=standalone.replace('<script src="'+name+'"></script>','<script>\n'+(ROOT/name).read_text()+'\n</script>')
for asset in ['fruit-bodies.png','share-template.png','qr.png']:
 uri='data:image/png;base64,'+base64.b64encode((ROOT/'assets'/asset).read_bytes()).decode()
 standalone=standalone.replace('assets/'+asset,uri)
ranking_doc=(ROOT/'rankings/index.html').read_text().replace('<script src="rankings.js"></script>','<script>'+(ROOT/'rankings/rankings.js').read_text()+'</script>')
standalone=standalone.replace('data-src="rankings/index.html"','data-src="data:text/html;base64,'+base64.b64encode(ranking_doc.encode()).decode()+'"')
for slug,(title,file)in children.items():
 standalone=standalone.replace('href="/'+slug+'/"','href="#'+slug+'"')
 body=(ROOT/'content'/file).read_text().replace('<h1>','<h2>').replace('</h1>','</h2>').replace('href="/"','href="#game"')
 standalone=standalone.replace('</main>','<section class="article" id="'+slug+'">'+body+'</section></main>')
(ROOT/'Fruit-Merge-Game-English.html').write_text(standalone)
(ROOT/'content/structured-data.json').write_text(json.dumps(schemas,ensure_ascii=False,indent=2))
print('Built offline previews, two child pages, and site/ with root-relative bidirectional links.')
