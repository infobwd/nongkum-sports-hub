import fitz,re,json,sys,collections,argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Extract draft sports/athletics from reviewed 41-page PDF')
parser.add_argument('--source',type=Path,default=Path('MittraphapGames_2569_R28_41pages_PETANQUE_FINALISTS_REVIEW_ONLY.pdf'))
parser.add_argument('--output',type=Path,default=Path('program-data.json'))
args=parser.parse_args()
SRC=args.source
doc=fitz.open(SRC)
sections={7:'ฟุตบอล',8:'ยิงจุดโทษ',9:'ฟุตซอล',11:'วอลเลย์บอล',12:'เซปักตะกร้อ',13:'เซปักตะกร้อ',14:'เปตอง',17:'เปตอง',18:'เปตอง',20:'เทเบิลเทนนิส',22:'ชักเย่อ'}
DATE=re.compile(r'^\d{1,2} พฤศจิกายน 2569$')
TIME=re.compile(r'^\d{2}:\d{2}$')
TEAM_COL=re.compile(r'^(สนาม\s*\d+|—|รอตรวจ)$')
records=[]
for pg,sport in sections.items():
 text=doc[pg-1].get_text()
 part=text.split('คู่\nเวลา\nรุ่น / ประเภท\nคู่แข่งขัน / รอบ\nสนาม\nสถานะ\n',1)[1]
 part=part.split('ข้อสังเกต:',1)[0].split('มิตรภาพเกมส์ 2569\n·',1)[0]
 lines=[v.strip() for v in part.split('\n') if v.strip()]
 k=0;date=None
 while k<len(lines):
  v=lines[k]
  if DATE.match(v):date=v;k+=1;continue
  if v.startswith('รอตรวจปี ·'):
   date='ยังไม่ยืนยันปี';k+=1;continue
  if re.fullmatch(r'\d{1,2}',v) and k+1<len(lines) and TIME.match(lines[k+1]):
   num=int(v); time=lines[k+1];div=lines[k+2]
   j=k+3
   pairparts=[]
   while j<len(lines) and not TEAM_COL.match(lines[j]):
    if DATE.match(lines[j]) or re.fullmatch(r'\d{1,2}',lines[j]) and j+1<len(lines) and TIME.match(lines[j+1]):break
    pairparts.append(lines[j]);j+=1
   if j>=len(lines) or not TEAM_COL.match(lines[j]):
    print('NO court',pg,num,'after',lines[k:k+9]);sys.exit(1)
   court=lines[j];status=lines[j+1] if j+1<len(lines) else ''
   pair=' '.join(pairparts)
   if sport=='เปตอง' and num==2 and pg==17: pair='รางขาม – ทุ่งมะสังฯ'
   if sport=='เปตอง' and num==10 and pg==17: pair='ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)'
   if sport=='เซปักตะกร้อ' and num==24 and pg==13: div='12 ปี หญิง'
   if not date:print('MISSING DATE',pg,num)
   records.append({'sport':sport,'source_page':pg,'match_no':num,'date_text':date,'time':time,'division':div,'pair':pair,'court':court if court!='—' else 'ยังไม่ระบุสนามย่อย','source_status':status})
   k=j+2
   continue
  print('UNMATCHED',pg,k,repr(lines[k:k+7]));k+=1
counts=collections.Counter(r['sport'] for r in records)
print('MATCH COUNT',len(records),sorted(counts.items()))
for p in ['เปตอง','เซปักตะกร้อ']:
 print(p,[{k:r[k] for k in ['match_no','division','pair']} for r in records if r['sport']==p and r['match_no'] in (2,10,24)])
print('FIRST',records[:3]);print('LAST',records[-2:])
# athletics
tracks=[];lane_total=0
for pg in range(23,36):
 text=doc[pg-1].get_text()
 part=text.split('ข้อมูลตาม V2 หน้า',1)[-1]
 part=part.split('รายการกรีฑายังไม่',1)[0]
 li=[x.strip() for x in part.splitlines() if x.strip()]
 pos=0
 while pos<len(li):
  if re.fullmatch(r'รายการ\s+\d+',li[pos]):
   no=int(li[pos].split()[-1]); event=li[pos+1];pos+=2
   if li[pos:pos+4]==['ลู่ที่','โรงเรียน / ศูนย์ฯ','ชื่อ – สกุล','ได้ที่']:pos+=4
   lanes=[]
   while pos<len(li) and not re.fullmatch(r'รายการ\s+\d+',li[pos]):
    if re.fullmatch(r'\d{1,2}',li[pos]) and pos+1<len(li):
     n=int(li[pos]);school=li[pos+1];lanes.append({'lane':n,'school':school});pos+=2
    else:
     pos+=1
   tracks.append({'sport':'กรีฑา','source_page':pg,'event_no':no,'event':event,'lanes':lanes,'date_text':'ยังไม่ระบุวันรายรายการ','time':'ยังไม่ระบุเวลา','source_status':'ตารางร่าง'})
  else:pos+=1
print('TRACK',len(tracks),'LANES',sum(len(t['lanes']) for t in tracks),'MISSING',sorted(set(range(1,51))-set(t['event_no'] for t in tracks)))
for t in tracks[:3]+tracks[-3:]: print(t)
if len(records)!=186 or len(tracks)!=50:
 raise Exception('Unexpected counts; stop for manual QA')
out={'meta':{'title':'มิตรภาพเกมส์ 2569','version':'R29-DRAFT','extraction_source':'R28 PDF 41 pages draft (15 Nov 2026) plus R27-C textual corrections; main JSON cross-check pending','total_matches':186,'athletics_events':50,'total_items':236,'note':'NOT approved results; R28 finalists are separately noted and not written as winners.'},'matches':records,'athletics':tracks,'review_notes':['เปตอง 10 ปีชาย คู่ 2: รางขาม – ทุ่งมะสังฯ ตามผังผู้จัดใน R27-B','เปตอง 10 ปีชาย คู่ 10: ผู้ชนะคู่ที่ 3 พบผู้ชนะคู่ที่ 4','เซปักตะกร้อ 12 ปี คู่ที่ 24: รุ่นหญิง ตามภาพผู้จัด','บ้านวังด้งเข้ารอบชิงเปตอง 10 ปีหญิง และ 12 ปีชาย ตาม PR #137 ยังไม่ทราบคู่แข่ง/คะแนนและหมายเลขคู่ที่ตรงกัน','ข้อมูลกำหนดการหลายรายการยังรอรับรอง; ห้ามใช้เป็นประกาศทางการ','ต้นฉบับกรีฑา 50 รายการปรากฏเลข 35 และ 48 อย่างละสองครั้ง โดยไม่มีเลข 49 และ 50; คงข้อความเดิมและรอตรวจรับ']}
args.output.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print('JSON bytes',args.output.stat().st_size)
