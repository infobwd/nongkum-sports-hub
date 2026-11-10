import fitz, re, html, hashlib, json
from pathlib import Path
from weasyprint import HTML
from PIL import Image
R=Path('/mnt/data'); W=R/'r26_bracket'; W.mkdir(exist_ok=True)
S=R/'ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2.pdf'
B=R/'MittraphapGames_2569_V2_41pages_R26_DesignV2_REVIEW_ONLY_20261110.pdf'
P=R/'MittraphapGames_2569_R26C_NewBrackets_Pages10_15_PILOT_REVIEW_ONLY.pdf'
F=R/'MittraphapGames_2569_R26C_V2_41pages_NewBracketPilot_10_15_REVIEW_ONLY.pdf'
J=R/'MittraphapGames_2569_R26C_NewBrackets_Preview.jpg'
H=lambda s:html.escape(str(s),quote=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(S)=='1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf'
assert sha(B)=='ef53cab1c9439cd9a7ddf5ce13f0fafca32039947e16f41e1ad0e6c6719087ac'
src=fitz.open(S);base=fitz.open(B)
assert len(src)==len(base)==41

def entries(page,bands,split):
    ans=[];words=page.get_text('words')
    for low,high in bands:
        names={}
        for w in words:
            if not low<w[1]<high:continue
            m=re.match(r'^([1-8])\.(.*)$',w[4])
            if not m:continue
            no=int(m.group(1)); name=m.group(2).lstrip('.').strip()
            if not name:
                following=sorted((v for v in words if abs(v[1]-w[1])<2 and 0<=v[0]-w[2]<17),key=lambda x:x[0]);assert following
                name=following[0][4].lstrip('.')
            key=('L' if w[0]<split else 'R',no)
            assert key not in names,(page.number,low,key)
            names[key]=name
        ans.append(names)
    return ans
v=entries(src[9],[(100,181),(224,308),(324,395),(412,477)],155)
p=entries(src[14],[(73,213),(234,376),(397,534),(543,683)],280)
assert [len(x) for x in v]==[6,6,2,2],v
assert [len(x) for x in p]==[8,8,8,8],p
for g in v[:2]:assert set(g)=={('L',i) for i in (1,2,3)}|{('R',i) for i in (1,2,3)}
for g in p:assert set(g)=={('L',i) for i in (1,2,3,4)}|{('R',i) for i in (5,6,7,8)}
for g in v[2:]:assert set(g)=={('L',1),('L',2)}

def shell(n,title,sub,content):
    return f'''<article class="paper"><div class="rail"></div><header><strong>มิตรภาพเกมส์ 2569</strong><span>DESIGN V2 / R26-C</span></header><div class="banner"><strong>ผังการแข่งขัน · ฉบับตรวจร่าง</strong><span>10 พ.ย. 2569</span></div><div class="intro"><small>ผังสายแบบใหม่ / เก็บเลขหน้าเดิม</small><h1>{H(title)}</h1><p>{H(sub)}</p></div><main>{content}</main><footer><span>สูจิบัตร V2 · ตรวจร่าง ไม่ใช่ผลแข่งขันหรือประกาศรับรอง</span><b>{n:02d} / 41</b></footer></article>'''

def pool(title, data, idx):
    cols=[]
    for side,name in [('L','สาย A'),('R','สาย B')]:
        rows=''.join(f'<div class="pool-team"><em>{i}</em><strong>{H(data[side,i])}</strong></div>' for i in (1,2,3))
        cols.append(f'<div class="pool-side"><h3>{name}</h3>{rows}</div>')
    return f'''<section class="pool"><div class="section-title"><b class="number">{idx:02d}</b><strong>{H(title)}</strong><span>แบ่งสาย A/B · สายละ 3 ทีม</span></div><div class="pool-grid">{cols[0]}<div class="pool-middle"><span>รอบรองชนะเลิศ</span><svg viewBox="0 0 70 60"><path d="M0 9 H22 V51 H0 M22 30 H48 M48 30 H70" fill="none" stroke="#b79860" stroke-width="1.5"/></svg><small>รออันดับ 1–2</small></div>{cols[1]}</div><div class="section-foot">ตาม V2: อันดับ 1–2 ของแต่ละสายเข้ารอบรอง • ยังไม่ระบุทีมผ่านเข้ารอบ</div></section>'''

def direct(title, data,idx):
    return f'''<section class="direct"><div class="section-title"><b class="number">{idx:02d}</b><strong>{H(title)}</strong></div><div class="faceoff"><strong>{H(data['L',1])}</strong><span>VS</span><strong>{H(data['L',2])}</strong></div><div class="section-foot">ตาม V2 · ยังไม่มีผลรับรอง</div></section>'''

volleyball=shell(10,'ผังวอลเลย์บอล','12 ปีชายและหญิงแบ่งสาย A/B • มัธยมชายและหญิงแข่งคู่เดียว ตามต้นฉบับหน้า 10',
    pool('12 ปีชาย',v[0],1)+pool('12 ปีหญิง',v[1],2)+
    '<div class="direct-grid">'+direct('มัธยมชาย',v[2],3)+direct('มัธยมหญิง',v[3],4)+'</div>'+
    '<div class="note">ข้อสังเกต: คู่ชิงวอลเลย์บอลในตารางหน้า 11 มีเลขคู่รอบรองที่ยังรอตรวจ • ห้ามเติมทีมเข้ารอบจากการคาดเดา</div>')

def lines():
    paths=[]
    y=[3.3,10.0,16.7,23.4]
    for a,b,c,d in [(64,72,80,88),(116,108,100,92)]:
        for t in y:paths.append(f'M{a} {t} H{b}')
        for i,j in [(0,1),(2,3)]:
            paths.append(f'M{b} {y[i]} V{y[j]}')
            paths.append(f'M{b} {(y[i]+y[j])/2} H{c}')
        paths.append(f'M{c} {(y[0]+y[1])/2} V{(y[2]+y[3])/2}')
        paths.append(f'M{c} 13.35 H{d}')
    return '<svg class="bracket-svg" viewBox="0 0 180 27" preserveAspectRatio="none"><path d="'+' '.join(paths)+'" fill="none" stroke="#a68b54" stroke-width="0.6" stroke-linecap="round"/></svg>'
SVG=lines()
def knockout(label,d,warning=False):
    slots=[]
    for side in ('L','R'):
        for i in range(1,5):
            n=i if side=='L' else i+4
            slots.append(f'<div class="slot {side} s{i}"><span class="ord">{n:02d}</span><strong>{H(d[side,n])}</strong></div>')
    return f'''<section class="knockout"><div class="section-title"><strong>เปตองประถมศึกษา · {H(label)}</strong><span class="{'warn' if warning else ''}">{'ตรวจชื่อทีมและสาย' if warning else '8 ทีม · แพ้คัดออก'}</span></div><div class="bracket">{SVG}{''.join(slots)}<div class="center"><b>VS</b><small>รอผล</small></div></div></section>'''
petanque=shell(15,'ผังเปตอง · ประถมศึกษา','ผัง 4 รุ่น × 8 ทีม • ช่อง 1–4 ฝั่งซ้าย และ 5–8 ฝั่งขวาตามต้นฉบับหน้า 15',
    knockout('8 ปีชาย',p[0])+knockout('8 ปีหญิง',p[1])+knockout('10 ปีชาย',p[2],True)+knockout('10 ปีหญิง',p[3])+
    '<div class="note compact">ข้อสังเกต: รุ่น 10 ปีชาย มีข้อมูลชื่อทีม/สายรอตรวจเทียบตารางหน้า 17 • ไม่ระบุผู้ชนะล่วงหน้า</div>')

css='''@font-face{font-family:Noto;src:url(file:///usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf)}
@font-face{font-family:Noto;src:url(file:///usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf);font-weight:700}
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Noto;color:#183652;background:#fff}
.paper{width:210mm;height:297mm;page-break-after:always;break-after:page;position:relative;overflow:hidden;background:#fdfcf9;padding:11mm 13mm 13mm 15mm}.paper:last-child{break-after:auto;page-break-after:auto}
.rail{position:absolute;left:5.5mm;top:14mm;bottom:11mm;width:1.5mm;background:#163755;border-radius:1mm}
header{height:6mm;display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:#183956}header span{font-size:7pt;color:#82939d}
.banner{background:#153753;color:#fff;border-radius:1.1mm;margin:2mm 0 3mm;height:8mm;padding:1.6mm 3mm;display:flex;justify-content:space-between;font-size:7.7pt}.banner span{color:#edcd99}
.intro{border-bottom:.6px solid #d6dfdd;margin-bottom:2mm;padding-bottom:2mm}.intro small{color:#ad7e30;font-weight:700;font-size:7.4pt}.intro h1{color:#163856;font-size:21pt;line-height:1.2;margin:0}.intro p{color:#617584;font-size:8pt;margin:1.4mm 0 0}
footer{position:absolute;left:15mm;right:13mm;bottom:8mm;display:flex;justify-content:space-between;color:#687988;border-top:.6px solid #d1dad8;padding-top:2mm;font-size:7pt}footer b{color:#173956}
/* Pool: no assumption about future standings */
.pool{height:69.5mm;border:.7px solid #d4dddb;background:#fff;border-radius:1.5mm;overflow:hidden;margin-bottom:4mm}.section-title{height:9mm;background:#edf2f1;border-bottom:.5px solid #d8e1df;display:flex;align-items:center;gap:2.2mm;padding:0 3mm}.section-title strong{font-size:10pt;color:#193a56}.section-title>span{margin-left:auto;color:#718392;font-size:8pt}.section-title .number{background:#b88f49;color:#fff;border-radius:1mm;padding:0 2mm;font-size:8pt}
.pool-grid{padding:3mm 4mm 0;display:grid;grid-template-columns:1fr 27mm 1fr;gap:2.5mm}.pool-side h3{font-size:9.5pt;color:#9b7139;border-bottom:.65px solid #bd9851;margin:0 0 1.7mm;padding-bottom:1mm}
.pool-team{height:10mm;border:.6px solid #d8dfdc;background:#fbfcfa;border-radius:.9mm;margin-bottom:1.9mm;display:flex;align-items:center;gap:2mm;padding:0 2mm}.pool-team strong{font-size:10pt}.pool-team em{color:#aa7e33;font-weight:700;font-style:normal;font-size:8.2pt}
.pool-middle{display:flex;flex-direction:column;align-items:center;padding-top:7mm;color:#906e31;font-size:8.3pt;font-weight:700;text-align:center}.pool-middle svg{width:21mm;height:16mm;margin:1mm}.pool-middle small{font-size:7.5pt;color:#788792}
.section-foot{font-size:7.5pt;color:#7c6c4e;padding:0 3mm}
.direct-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:1mm}.direct{background:#fff;border:.6px solid #d5dddd;border-radius:1.5mm;overflow:hidden;height:38.5mm}.direct .section-title{height:8.5mm}
.faceoff{display:flex;gap:1mm;align-items:center;justify-content:space-between;padding:4mm 2.3mm 2mm}.faceoff strong{display:block;border:.5px solid #d2dddc;border-radius:1mm;white-space:nowrap;flex:1;text-align:center;font-size:8.4pt;padding:1.8mm .4mm}.faceoff span{color:#a78542;font-weight:700;font-size:9pt}.direct .section-foot{text-align:center}
.note{margin-top:3mm;padding:2mm 3mm;background:#f7eddf;color:#8d642c;border-left:1.5mm solid #bd9759;font-size:7.8pt;line-height:1.4}
/* Four mirrored knockout diagrams; all 32 original seeded positions preserved */
.knockout{height:47.5mm;background:#fff;border:.6px solid #d7dfdc;border-radius:1.4mm;overflow:hidden;margin-bottom:3.5mm}
.knockout .section-title{height:8.5mm}.knockout .section-title strong{font-size:9.7pt}.knockout .section-title span{font-size:7.5pt}.knockout .section-title span.warn{font-weight:700;color:#a36526}
.bracket{position:relative;height:30.5mm;margin:1.5mm 2mm 0}.bracket-svg{position:absolute;inset:0;width:100%;height:100%}
.slot{height:6.1mm;width:35%;position:absolute;display:flex;align-items:center;gap:1.2mm;white-space:nowrap;background:#fbfcfa;border:.55px solid #d3dedc;border-radius:.85mm;padding:0 1.1mm}.slot strong{font-size:8.7pt}.slot .ord{font-size:7.5pt;font-weight:700;color:#957342}
.slot.L{left:0}.slot.R{right:0;justify-content:space-between}.slot.s1{top:.6mm}.slot.s2{top:7.35mm}.slot.s3{top:14.1mm}.slot.s4{top:20.85mm}
.center{position:absolute;left:46%;width:8%;top:11.5mm;background:#163956;color:#fff;border-radius:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;height:9mm}.center b{font-size:8pt}.center small{color:#eed0a1;font-size:6pt}
.note.compact{margin-top:1.1mm;font-size:7.5pt;padding:1.6mm 2.4mm}
'''
html_doc='<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+volleyball+petanque+'</body></html>'
(W/'bracket_pilot.html').write_text(html_doc)
HTML(string=html_doc,base_url=str(W)).write_pdf(str(P))
pilot=fitz.open(P)
assert len(pilot)==2,('page spill',len(pilot))
full=fitz.open()
for num in range(1,42):
    if num in [10,15]:full.insert_pdf(pilot,from_page=0 if num==10 else 1,to_page=0 if num==10 else 1)
    else:full.insert_pdf(base,from_page=num-1,to_page=num-1)
full.set_toc(base.get_toc())
for name in base.embfile_names():
    info=base.embfile_info(name)
    full.embfile_add(name,base.embfile_get(name),filename=info.get('filename',name),desc=info.get('desc','Original V2 evidence'))
full.save(F,garbage=4,deflate=True)
full.close()
pilot.close()
with fitz.open(F) as doc:
    assert len(doc)==41
    unchanged=0;outside=[]
    for i in range(41):
        if i not in [9,14]:
            assert base[i].get_text()==doc[i].get_text(),('changed other page',i+1)
            unchanged+=1
        page=doc[i]
        assert ((abs(page.rect.width-595.3)<1 and abs(page.rect.height-841.9)<1) or (i in (36,37,38,39) and abs(page.rect.width-841.9)<1 and abs(page.rect.height-595.3)<1)), (i+1,page.rect)
        for w in page.get_text('words'):
            if w[0]<-1 or w[1]<-1 or w[2]>page.rect.width+1 or w[3]>page.rect.height+1:
                outside.append((i+1,w[4]))
    assert not outside,outside[:10]
    assert unchanged==39
    assert doc.get_toc()==base.get_toc()
    assert doc.embfile_names()==base.embfile_names()
    for name in base.embfile_names():assert hashlib.sha256(doc.embfile_get(name)).hexdigest()==hashlib.sha256(base.embfile_get(name)).hexdigest()
    for idx,groups in [(10,v),(15,p)]:
        t=doc[idx-1].get_text()
        for g in groups:
            for name in g.values(): assert name in t,('missing source team',idx,name)
    qa={'page_count':len(doc),'changed_pages':[10,15],'unchanged_pages':unchanged,'bookmarks':len(doc.get_toc()),'source_sha256':sha(S),'previous_r26_sha256':sha(B),'new_r26c_sha256':sha(F),'two_page_pilot_sha256':sha(P),'p10_slot_groups':[len(g) for g in v],'p15_bracket_groups':[len(g) for g in p],'all_teams_source_verified':True,'out_of_bounds':outside,'original_pdf_embedded_unchanged':True,'review_status':'DRAFT_ONLY_NOT_FIELD_APPROVED'}
    (W/'R26C_PILOT_QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
    print(json.dumps(qa,ensure_ascii=False,indent=2))
    images=[]
    for n in [10,15]:
        pm=doc[n-1].get_pixmap(matrix=fitz.Matrix(1.6,1.6),alpha=False)
        im=Image.frombytes('RGB',(pm.width,pm.height),pm.samples)
        im.save(W/f'page-{n:02}.png')
        images.append(im)
    preview=Image.new('RGB',(images[0].width*2,images[0].height),'white')
    for i,im in enumerate(images):preview.paste(im,(i*images[0].width,0))
    preview.thumbnail((1500,1100));preview.save(J,quality=91)
print(P,F,J,sep='\n')