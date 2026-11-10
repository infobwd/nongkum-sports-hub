from pathlib import Path
import fitz, re, html, json, hashlib
from weasyprint import HTML
from PIL import Image, ImageOps, ImageDraw

R=Path('/mnt/data'); W=R/'r26_bracket'; W.mkdir(exist_ok=True)
S=R/'ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2.pdf'
B=R/'MittraphapGames_2569_R26C_V2_41pages_NewBracketPilot_10_15_REVIEW_ONLY.pdf'
F=R/'MittraphapGames_2569_R26D_V2_41pages_BracketRedesign_10_15_16_19_21_REVIEW_ONLY_20261110.pdf'
P=R/'MittraphapGames_2569_R26D_NewBrackets_Pages16_19_21_PILOT_REVIEW_ONLY.pdf'
J=R/'MittraphapGames_2569_R26D_NewBrackets_Preview.jpg'
H=lambda s:html.escape(str(s),quote=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(S)=='1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf'
assert sha(B)=='20adcb54a2f6d41ead0e951d80bf74a99a029f265ed05bd780c6b8944a669e95',sha(B)
src=fitz.open(S);base=fitz.open(B);assert len(src)==len(base)==41

# Source text contains the numbered groups; preserve names and numbers exactly.
def entries(page,bands,split=280):
    ans=[]; words=page.get_text('words')
    for low,high in bands:
        names={}
        for w in words:
            if not low<w[1]<high:continue
            m=re.fullmatch(r'([1-8])\.(.*)',w[4])
            if not m:continue
            no=int(m.group(1));name=m.group(2).lstrip('.').strip()
            if not name:
                following=sorted((v for v in words if abs(v[1]-w[1])<2 and 0<=v[0]-w[2]<17),key=lambda x:x[0])
                assert following, (page.number,low,w)
                name=following[0][4].lstrip('.')
            key=('L' if w[0]<split else 'R',no)
            assert key not in names,(page.number,low,key)
            names[key]=name
        ans.append(names)
    return ans
bands={
    16:[(70,215),(230,375),(394,462),(480,560)],
    19:[(73,215),(235,380),(396,463),(487,566)],
    21:[(72,210),(214,354),(360,495),(507,569),(580,640)],
}
groups={n:entries(src[n-1],bands[n]) for n in bands}
for n,expected in [(16,[8,8,2,2]),(19,[8,8,2,2]),(21,[8,8,7,2,2])]:
    assert [len(x) for x in groups[n]]==expected,(n,[len(x) for x in groups[n]],groups[n])
for n in (16,19,21):
    for ix,g in enumerate(groups[n]):
        if len(g)>2:
            assert set(k for k in g if k[0]=='L') == {('L',i) for i in (1,2,3,4)},(n,ix,g)
            expect={('R',i) for i in (5,6,7,8)}
            if n==21 and ix==2:expect.remove(('R',8))
            assert set(k for k in g if k[0]=='R')==expect,(n,ix,g)
        else:assert set(g)=={('L',1),('L',2)},(n,ix,g)
print('Source bracket-group slots:', {k:[len(g) for g in x] for k,x in groups.items()})

# Adapt the verified R26-C page shell/styles while using actual PDF school labels.
previous_script=(W/'build_r26c.py').read_text()
base_css=re.search(r"css='''(.*?)'''",previous_script,re.S).group(1)
# Reproduce 8-team bracket paths accurately without inventing winners or school assignments.
SVG='''<svg class="bracket-svg" viewBox="0 0 180 27" preserveAspectRatio="none"><path d="M64 3.3 H72 M64 10 H72 M72 3.3 V10 M72 6.65 H80 M64 16.7 H72 M64 23.4 H72 M72 16.7 V23.4 M72 20.05 H80 M80 6.65 V20.05 M80 13.35 H88 M116 3.3 H108 M116 10 H108 M108 3.3 V10 M108 6.65 H100 M116 16.7 H108 M116 23.4 H108 M108 16.7 V23.4 M108 20.05 H100 M100 6.65 V20.05 M100 13.35 H92" fill="none" stroke="#a68b54" stroke-width="0.6" stroke-linecap="round"/></svg>'''

def shell(n,title,sub,content):
    return f'''<article class="paper r26d"><div class="rail"></div><header><strong>มิตรภาพเกมส์ 2569</strong><span>DESIGN V2 / R26-D</span></header><div class="banner"><strong>ผังการแข่งขัน · ฉบับตรวจร่าง</strong><span>10 พ.ย. 2569</span></div><div class="intro"><small>ผังสายแบบใหม่ / คงเลขหน้าเดิม</small><h1>{H(title)}</h1><p>{H(sub)}</p></div><main>{content}</main><footer><span>สูจิบัตร V2 · ตรวจร่าง ไม่ใช่ผลแข่งขันหรือประกาศรับรอง</span><b>{n:02d} / 41</b></footer></article>'''

def knockout(sport,label,data,extra='',density='normal'):
    slots=[]
    for side in ('L','R'):
        for i in range(1,5):
            k=i if side=='L' else i+4
            val=data.get((side,k))
            if val:
                slots.append(f'<div class="slot {side} s{i}"><span class="ord">{k:02d}</span><strong>{H(val)}</strong></div>')
            else:
                assert sport=='ชักเย่อ' and k==8 and label=='12 ปีหญิง'
                slots.append(f'<div class="slot missing {side} s{i}"><span class="ord">{k:02d}</span><strong>ไม่ปรากฏทีมในต้นฉบับ</strong></div>')
    note=extra or (('7 รายชื่อ • ช่อง 8 รอตรวจ' if len(data)==7 else '8 ทีม · แพ้คัดออก'))
    return f'''<section class="knockout {density}"><div class="section-title"><strong>{H(sport)} · {H(label)}</strong><span class="{'warn' if extra or len(data)==7 else ''}">{H(note)}</span></div><div class="bracket">{SVG}{''.join(slots)}<div class="center"><b>VS</b><small>รอผล</small></div></div></section>'''

def direct(sport,label,data,idx):
    return f'''<section class="direct"><div class="section-title"><b class="number">{idx:02d}</b><strong>{H(sport)} · {H(label)}</strong></div><div class="faceoff"><strong>{H(data['L',1])}</strong><span>VS</span><strong>{H(data['L',2])}</strong></div><div class="section-foot">ตามต้นฉบับ V2 · ยังไม่มีผลรับรอง</div></section>'''

def direct_grid(sport,g,labels):
    return f'<div class="direct-grid">'+''.join(direct(sport,l,x,i+1) for i,(l,x) in enumerate(zip(labels,g)))+'</div>'

petanque=shell(16,'ผังเปตอง · 12 ปีและมัธยม','ผัง 12 ปีชาย–หญิง รุ่นละ 8 ทีม • มัธยมชาย–หญิง แข่งขันคู่เดียวตาม V2',
    knockout('เปตอง','12 ปีชาย',groups[16][0],density='large')+
    knockout('เปตอง','12 ปีหญิง',groups[16][1],density='large')+
    direct_grid('เปตอง',groups[16][2:],['มัธยมชาย','มัธยมหญิง'])+
    '<div class="note">ผังแสดงชื่อทีมจาก V2 เดิมเท่านั้น • รอบถัดไปยังไม่ระบุผู้ชนะ</div>')

tt=shell(19,'ผังเทเบิลเทนนิส','ประถมศึกษาชาย–หญิง รุ่นละ 8 ทีม • มัธยมชาย–หญิง แข่งขันคู่เดียวตาม V2',
    knockout('เทเบิลเทนนิส','ประถมชาย',groups[19][0],density='large')+
    knockout('เทเบิลเทนนิส','ประถมหญิง',groups[19][1],density='large')+
    direct_grid('เทเบิลเทนนิส',groups[19][2:],['มัธยมชาย','มัธยมหญิง'])+
    '<div class="note">ข้อมูลคู่/สายอ้างอิง V2 หน้า 19 • ยังไม่ใช่ผลการแข่งขัน</div>')

tug=shell(21,'ผังชักเย่อ · ทุกระดับ','ปฐมวัยและ 12 ปีชาย/หญิง แบบแพ้คัดออก • มัธยมชาย–หญิง แข่งขันคู่เดียว',
    knockout('ชักเย่อ','ปฐมวัย',groups[21][0],density='compact')+
    knockout('ชักเย่อ','12 ปีชาย',groups[21][1],density='compact')+
    knockout('ชักเย่อ','12 ปีหญิง',groups[21][2],density='compact')+
    direct_grid('ชักเย่อ',groups[21][3:],['มัธยมชาย','มัธยมหญิง'])+
    '<div class="note compact">ข้อสังเกต: ชักเย่อ 12 ปีหญิง มีรายชื่อ 7 ทีมใน V2 ไม่ปรากฏตำแหน่งที่ 8 • รอผู้จัดตรวจ ไม่เติมทีม/ผล</div>')
css=base_css+'''
/* R26D: increased legibility where there are only two knockout brackets on the page */
.knockout.large{height:76mm;margin-bottom:5mm}
.knockout.large .section-title{height:10mm}
.knockout.large .section-title strong{font-size:10.6pt}
.knockout.large .bracket{height:42mm;margin-top:8mm}
.knockout.large .slot{height:8.4mm;padding:0 1.5mm}
.knockout.large .slot.s1{top:1.4mm}
.knockout.large .slot.s2{top:12.1mm}
.knockout.large .slot.s3{top:22.8mm}
.knockout.large .slot.s4{top:33.5mm}
.knockout.large .slot strong{font-size:10.7pt}
.knockout.large .slot .ord{font-size:8.2pt}
.knockout.large .center{top:17mm;height:10mm}
.knockout.large+.knockout.large{margin-bottom:5mm}
.r26d .direct-grid{margin-top:1.2mm}
.r26d .direct{height:38mm}
.r26d .direct .faceoff strong{font-size:9.8pt}
.r26d .knockout.compact{height:52mm;margin-bottom:3.4mm}
.r26d .knockout.compact .section-title{height:9.4mm}
.r26d .knockout.compact .bracket{height:34mm;margin-top:2.5mm}
.r26d .knockout.compact .slot{height:7.1mm}
.r26d .knockout.compact .slot.s1{top:1.1mm}
.r26d .knockout.compact .slot.s2{top:9.7mm}
.r26d .knockout.compact .slot.s3{top:18.3mm}
.r26d .knockout.compact .slot.s4{top:26.9mm}
.r26d .knockout.compact .slot strong{font-size:9.7pt}
.r26d .knockout.compact .center{top:13.5mm;height:9mm}
.r26d .knockout.compact .section-title strong{font-size:9.9pt}
.r26d .slot.missing{border-style:dashed;border-color:#bb8c40;background:#fbf4e8;color:#996225}
.r26d .slot.missing strong{font-size:7.8pt;color:#9c6c3a}
.r26d .note{margin-top:3mm;font-size:8pt}
.r26d .direct .section-title strong{font-size:9.5pt}
'''
html_doc='<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+petanque+tt+tug+'</body></html>'
(W/'bracket_next.html').write_text(html_doc)
HTML(string=html_doc,base_url=str(W)).write_pdf(str(P))
pilot=fitz.open(P)
assert len(pilot)==3,('pilot page spill',len(pilot))
full=fitz.open()
for num in range(1,42):
    if num in [16,19,21]:
        pnum={16:0,19:1,21:2}[num]
        full.insert_pdf(pilot,from_page=pnum,to_page=pnum)
    else:full.insert_pdf(base,from_page=num-1,to_page=num-1)
full.set_toc(base.get_toc())
for name in base.embfile_names():
    info=base.embfile_info(name)
    full.embfile_add(name,base.embfile_get(name),filename=info.get('filename',name),desc=info.get('desc','Original V2 evidence'))
full.save(F,garbage=4,deflate=True)
full.close();pilot.close()

with fitz.open(F) as doc:
    assert len(doc)==41
    same=0;out_of_bounds=[]
    for i in range(41):
        if i not in [15,18,20]:
            assert doc[i].get_text()==base[i].get_text(),('other page changed',i+1)
            same+=1
        p=doc[i]
        is_landscape=i in (36,37,38,39)
        assert (abs(p.rect.width-(841.92 if is_landscape else 595.32))<1 and abs(p.rect.height-(595.32 if is_landscape else 841.92))<1),(i,p.rect)
        for w in p.get_text('words'):
            if w[0]<-1 or w[1]<-1 or w[2]>p.rect.width+1 or w[3]>p.rect.height+1:
                out_of_bounds.append((i+1,w[4]))
    assert not out_of_bounds,out_of_bounds[:10]
    assert same==38
    assert doc.get_toc()==base.get_toc()
    assert doc.embfile_names()==base.embfile_names()
    for name in base.embfile_names():assert hashlib.sha256(doc.embfile_get(name)).hexdigest()==hashlib.sha256(base.embfile_get(name)).hexdigest()
    for idx in [16,19,21]:
        t=doc[idx-1].get_text()
        for g in groups[idx]:
            for name in g.values():
                assert name in t,('missing source team',idx,name)
    assert 'ไม่ปรากฏทีมในต้นฉบับ' in doc[20].get_text()
    assert 'ไม่ปรากฏทีมในต้นฉบับ' not in doc[15].get_text()
    qa={'page_count':41,'changed_pages':[16,19,21],'redesigned_to_date':[10,15,16,19,21],'unchanged_pages':same,'bookmarks':len(doc.get_toc()),'source_sha256':sha(S),'previous_r26c_sha256':sha(B),'r26d_sha256':sha(F),'excerpt_sha256':sha(P),'group_counts':{str(k):[len(g) for g in gg] for k,gg in groups.items()},'names_source_verified':True,'bounds_errors':out_of_bounds,'embedded_source_verified':True,'missing_slot_warning':'page21_12_year_girls_slot8_missing','status':'review_only_not_approved'}
    (W/'R26D_NEXT_QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
    print(json.dumps(qa,ensure_ascii=False,indent=2))
    imgs=[]
    for n in [16,19,21]:
        p=doc[n-1].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
        im=Image.frombytes('RGB',(p.width,p.height),p.samples)
        im.save(W/f'r26d-page-{n:02}.png');imgs.append(im)
    preview=Image.new('RGB',(imgs[0].width*3,imgs[0].height),'white')
    for i,im in enumerate(imgs):preview.paste(im,(i*im.width,0))
    preview.thumbnail((2100,1500));preview.save(J,quality=91)
print('FILES',P,F,J,sep='\n')