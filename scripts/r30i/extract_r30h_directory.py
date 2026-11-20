import fitz,re,json
src='/mnt/data/R30H_MittraphapGames_2569_Clickable_20_Committee_TOC_44pages_REVIEW_ONLY.pdf'
doc=fitz.open(src)
expected=[21,17,9,5,2,2,15,18,5,15,8,10,9,48,31,5,6,3,13,8]
records={}
for group in range(1,21):records[group]=[]
for pdfpage in range(22,44):
 p=doc[pdfpage-1]
 if pdfpage <=34:group=pdfpage-21
 elif pdfpage<=36:group=14
 elif pdfpage<=38:group=15
 else:group=pdfpage-23
 # get characters sorted by y and x; exclude 0.9pt hidden debug ids
 lines=[]
 for b in p.get_text('dict')['blocks']:
  for line in b.get('lines',[]):
   good=[s for s in line['spans'] if s['size']>=6.0 and s['text'].strip()]
   if good:
    lines.append({'y':min(s['bbox'][1] for s in good),'x':min(s['bbox'][0] for s in good),'text':''.join(s['text'] for s in good),'size':min(s['size'] for s in good)})
 codes=[]
 for ln in lines:
  if 59<=ln['x']<=64 and ln['y']>85 and re.match(r'^(\d+(?:\.\d+)*|—)$',ln['text'].strip()):
   codes.append(ln)
 # group10 awards rows may use numbers 1..6 and capture them
 for i,code in enumerate(codes):
  y0=code['y']-2.5
  y1=(codes[i+1]['y']-2.5) if i+1<len(codes) else 797
  def segment(x0,x1):
   ss=[ln for ln in lines if x0<=ln['x']<x1 and y0<=ln['y']<y1 and ln['size']>=6.0]
   ss.sort(key=lambda o:(round(o['y'],1),o['x']))
   result=[]
   for ln in ss:
    if not result or abs(result[-1][0]-ln['y'])>4.0:result.append([ln['y'],ln['text']])
    else:result[-1][1]+=ln['text']
   return ' '.join(x[1].strip() for x in result if x[1].strip())
  code_txt=code['text']
  name=segment(112,255).strip(); affiliation=segment(255,425).strip(); role=segment(425,550).strip()
  records[group].append({'code':code_txt,'name':name,'school':affiliation,'role':role,'source_page':pdfpage})
for k,v in records.items():
 print(k,len(v),'expected',expected[k-1], 'first',v[0] if v else None,'last',v[-1] if v else None)
 assert len(v)==expected[k-1],(k,len(v),expected[k-1])
 assert all(x['name'] and x['school'] and x['role'] for x in v),('missing',k,[x for x in v if not x['name'] or not x['school'] or not x['role']])
assert sum(len(v) for v in records.values())==250
open('/mnt/data/r30i_records.json','w').write(json.dumps(records,ensure_ascii=False,indent=2))