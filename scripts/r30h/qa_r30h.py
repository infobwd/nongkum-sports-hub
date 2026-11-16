import fitz,hashlib,json,sys
from pathlib import Path
b=Path('/mnt/data')
p=b/'R30G_MittraphapGames_2569_R30G_Committee_Summary_FixedPage_44pages_REVIEW_ONLY.pdf'
q=b/'R30H_MittraphapGames_2569_Clickable_20_Committee_TOC_44pages_REVIEW_ONLY.pdf'
a=fitz.open(p);d=fitz.open(q)
exp=[22,23,24,25,26,27,28,29,30,31,32,33,34,35,37,39,40,41,42,43]
assert len(a)==len(d)==44
assert all(abs((d[i].rect-a[i].rect).height)<.01 for i in range(44))
assert all(d[i].get_text()==a[i].get_text() for i in range(44) if i!=2)
assert all(len(d[i].get_links())==len(a[i].get_links()) for i in range(44) if i!=2)
for i in range(44):
 if i==2: continue
 al=a[i].get_links(); dl=d[i].get_links()
 for x,y in zip(al,dl):
  assert x['kind']==y['kind'] and x.get('page')==y.get('page') and x.get('uri')==y.get('uri')
q3=d[2].get_links()
internal=[x for x in q3 if x['kind']==1]
assert len(internal)==28 and len(q3)==29
mapped=[x['page']+1 for x in internal[8:]]
assert mapped==exp,(mapped,exp)
assert all(0<=x['page']<44 for x in internal)
assert len(d.get_toc())==len(a.get_toc())==31
assert all('คณะกรรมการ' in x[1] for x in d.get_toc() if x[1].startswith('คณะกรรมการ '))
assert all(d[p-1].get_text().find('หมวด '+str(i+1))>=0 for i,p in enumerate(exp))
# Footer navigation preserved in all committee pages
assert all(any(x.get('page')==2 for x in d[p-1].get_links()) for p in range(22,44))
report={'status':'QA_PROGRAMMATIC_PASS','version':'R30H','page_count':len(d),'page3_goto_links':len(internal),'page3_committee_links':20,'page3_main_links':8,'page3_website_links':1,'bookmarks':len(d.get_toc()),'all_other_page_text_exact_match':43,'all_other_page_link_maps_match':43,'committee_destinations_1based':mapped,'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'output_size_bytes':q.stat().st_size,'limitations':['Mobile actual Safari/Chrome/LINE not acceptance-tested','Physical A4 print not tested','External Drive share permission not independently verified','Draft names and announcement not organizer-approved']}
(b/'R30H_QA_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=2))