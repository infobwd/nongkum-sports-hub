#!/usr/bin/env python3
"""Rebuild ONLY approved-style notice preview with original 341 source lines and full Sarabun TTF."""
from __future__ import annotations
import argparse,hashlib,html,json,re,unicodedata
from pathlib import Path
from bs4 import BeautifulSoup
from fontTools.ttLib import TTFont
from weasyprint import HTML
import fitz
from PIL import Image,ImageDraw

p=argparse.ArgumentParser()
p.add_argument("--html",required=True,type=Path)
p.add_argument("--fonts",required=True,type=Path)
p.add_argument("--out",required=True,type=Path)
args=p.parse_args()
out=args.out.resolve();out.mkdir(parents=True,exist_ok=True)
reg=(args.fonts/"Sarabun-Regular.ttf").resolve()
bold=(args.fonts/"Sarabun-Bold.ttf").resolve()
for fn in (reg,bold):
    if not fn.is_file() or fn.stat().st_size<50000:raise ValueError("Refuse font subset: "+str(fn))
    cmap=set().union(*(set(table.cmap) for table in TTFont(fn)["cmap"].tables))
    if not {0x0E33,0x0E48,0x0E49,0x0E4D,0x0E01}.issubset(cmap):
        raise ValueError("Sarabun missing Thai vowel / tone codepoints")

soup=BeautifulSoup(args.html.read_text("utf-8"),"html.parser")
source=[{"id":z["data-source-line"],"kind":z.get("class",[""])[0],"text":z.get_text(" ",strip=True)}
        for z in soup.select(".v42-official-content [data-source-line]")]
if len(source)!=341 or len({r["id"] for r in source})!=341:raise ValueError("Source fidelity changed")
P=lambda s:re.sub(r"\s+"," ",s).strip()
role=re.compile(r"(กรรมการและผู้ช่วยเลขานุการ|กรรมการและเลขานุการ|รองประธานกรรมการ|ประธานกรรมการ|กรรมการ|กรรมกา)$")
num=re.compile(r"^(\d+(?:\.\d+){1,3})\s+(.*)")
heading=re.compile(r"^(\d{1,2})\.\s+(คณะกรรมการ|ฝ่าย)")
units=[];intro=[];closing=[];separators=[];last=None;cur=None
for r in source:
    t=r["text"];i=r["id"]
    if r["kind"]=="v42-document-title":continue
    if t and set(t).issubset(set("….-_—. ·")):separators.append(i);continue
    if heading.match(t):
        cur={"heading":t,"ids":[i],"items":[]};units.append(cur);last=None;continue
    if cur is None:intro.append(r);continue
    if r["kind"]=="v42-closing-line" or i.startswith("v3-p16-"):
        closing.append(r);last=None;continue
    if t.startswith("มีหน้าที่"):
        last={"type":"duty","text":t,"ids":[i]};cur["items"].append(last);continue
    m=num.match(t)
    if m:
        n,b=m.groups();b=P(b);rmatch=role.search(b)
        name=b[:rmatch.start()].strip() if rmatch else b
        role_name=rmatch.group(1) if rmatch else ""
        ishead=not role_name and any(sport in b for sport in
                         ("ฟุตบอล","ฟุตซอล","วอลเลย์บอล","เซปักตะกร้อ","เทเบิลเทนนิส","เปตอง","ชักเย่อ","คณะกรรมการ"))
        last={"type":"subhead" if ishead else "member","number":n,
              "name":name,"role":role_name,"ids":[i]}
        cur["items"].append(last);continue
    if last is not None and last["type"] in ("member","duty"):
        field="text" if last["type"]=="duty" else "name"
        last[field]+=(" " if last[field][-1] in ".,;:ฯ" else "")+t
        last["ids"].append(i)
    else:
        last={"type":"body","text":t,"ids":[i]};cur["items"].append(last)
if len(units)!=20 or len(closing)!=5 or sum(x["type"]=="duty" for u in units for x in u["items"])!=20:
    raise ValueError("Source structural counts changed")
E=lambda x:html.escape(str(x).replace("\u0E33","\u0E4D\u0E32"),quote=True)  # Compatibility-equivalent Thai Sara Am; preserves glyph shaping and extraction.
A=lambda ids:' data-source-ids="'+",".join(ids)+'"'
def join(items):
    return "".join((" " if k and items[k-1]["text"].rstrip().endswith(("หนองกุ่ม","เต็มความสามารถ")) else "")
                   +v["text"].strip() for k,v in enumerate(items))
chunks=['<div class="official-head">',
        '<p class="doc-title"'+A([source[0]["id"]])+'>'+E(source[0]["text"])+'</p>',
        '<p class="doc-subject"'+A([source[1]["id"]])+'>'+E(source[1]["text"])+'</p>',
        '<div class="official-rule"'+A(separators)+'></div></div>',
        '<p class="intro"'+A([x["id"] for x in intro])+'>'+E(join(intro))+'</p>']
for u in units:
    chunks.append('<section class="unit"><h2 class="unit-title"'+A(u["ids"])+'>'
                  +E(u["heading"])+'</h2>')
    for item in u["items"]:
        t=item["type"];attr=A(item["ids"])
        if t=="member":
            chunks.append('<div class="official-member"'+attr+'><div class="no">'+E(item["number"])+
             '</div><div class="member-name">'+E(item["name"])+
             '</div><div class="role">'+E(item["role"])+'</div></div>')
        elif t=="subhead":
            chunks.append('<h3 class="subheading"'+attr+'>'+E(item["number"]+" "+item["name"])+'</h3>')
        elif t=="duty":
            chunks.append('<p class="duty"'+attr+'><strong>มีหน้าที่</strong> '+
                          E(re.sub(r"^มีหน้าที่\s*","",item["text"]))+'</p>')
        else:chunks.append('<p class="body"'+attr+'>'+E(item["text"])+'</p>')
    chunks.append('</section>')
chunks.append('<div class="closing"><p class="final-text"'+A([closing[0]["id"],closing[1]["id"]])+'>'
              +E(join(closing[:2]))+'</p>')
chunks.extend(['<p class="date-text"'+A([closing[2]["id"]])+'>'+E(closing[2]["text"])+'</p>',
 '<div class="sign-space"></div>',
 '<p class="sign-name"'+A([closing[3]["id"]])+'>'+E(closing[3]["text"])+'</p>',
 '<p class="sign-position"'+A([closing[4]["id"]])+'>'+E(closing[4]["text"])+'</p></div>'])
document_html="".join(chunks)
source_ids=[x["id"] for x in source]
rendered=[]
for tag in BeautifulSoup(document_html,"html.parser").select("[data-source-ids]"):
    rendered.extend(tag["data-source-ids"].split(","))
if len(rendered)!=341 or set(rendered)!=set(source_ids) or len(set(rendered))!=341:
    raise ValueError("341 source lines not preserved")
css="""@font-face{font-family:SarabunFull;src:url('REGULAR_FONT');font-weight:400}
@font-face{font-family:SarabunFull;src:url('BOLD_FONT');font-weight:700}
@page{size:A4;margin:21mm 23mm 18mm 23mm;
@top-right{content:"ฉบับร่าง · เพื่อพิจารณาการจัดหน้า";font:8pt SarabunFull;color:#858585}
@bottom-left{content:"สูจิบัตรมิตรภาพเกมส์ 2569 · หมวดประกาศ (ตัวอย่างจัดหน้า)";font:8pt SarabunFull;color:#858585}
@bottom-right{content:"หน้า " counter(page);font:8pt SarabunFull;color:#555}}
@page:first{margin-top:25mm;@top-right{content:"ร่าง · ยังไม่ใช่ประกาศที่รับรอง"}}
*{box-sizing:border-box}html,body{margin:0;padding:0;color:#171717;font-family:SarabunFull,serif;font-size:13pt;line-height:1.48}
.official-head{text-align:center;break-after:avoid;margin:2mm 0 7.5mm}
.doc-title{font-weight:700;font-size:17pt;line-height:1.3;margin:0 0 2mm}
.doc-subject{font-weight:700;font-size:14pt;line-height:1.4;margin:0 0 5mm}
.official-rule{margin:0 auto;border-top:1px solid #444;width:27mm;height:1px}
.intro{font-size:13.3pt;line-height:1.85;text-indent:12mm;text-align:justify;margin:4mm 0 7mm;orphans:2;widows:2}
.unit{margin:3mm 0 5mm}.unit-title{font-size:13.7pt;font-weight:700;line-height:1.48;margin:5mm 0 1.5mm;break-after:avoid}
.official-member{display:grid;grid-template-columns:12mm minmax(0,1fr) 33mm;column-gap:2.5mm;align-items:baseline;margin:0;padding:.3mm 0 .5mm;line-height:1.35;font-size:11.35pt;break-inside:avoid}
.official-member .no{text-align:left;white-space:nowrap}.official-member .member-name{overflow-wrap:anywhere;line-height:1.4}
.official-member .role{text-align:right;font-size:9.55pt;line-height:1.35;overflow-wrap:anywhere}
.subheading{font-size:12.5pt;margin:3mm 0 1mm 7mm;break-after:avoid;font-weight:700}
.duty{margin:2.5mm 0 4mm;line-height:1.8;font-size:12.3pt;text-align:justify;text-indent:11mm;break-inside:avoid}.duty strong{font-weight:700}
.body{text-indent:11mm;text-align:justify;font-size:12.3pt;margin:1.5mm 0}
.closing{break-inside:avoid;padding-top:3mm;font-size:13pt}
.final-text{text-indent:11mm;line-height:1.8;text-align:justify;margin:2mm 0 7mm}
.date-text{text-align:center;width:61%;margin:5mm 0 1mm auto}.sign-space{height:10mm;width:61%;margin-left:auto}
.sign-name,.sign-position{text-align:center;width:61%;margin:0 0 0 auto;line-height:1.6}
.sign-name{font-size:13pt}.sign-position{font-size:11.6pt}"""
css=css.replace("REGULAR_FONT",reg.as_uri()).replace("BOLD_FONT",bold.as_uri())
pdfpath=out/"announcement_formal_preview_v2.pdf"
HTML(string='<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+
     '</style></head><body>'+document_html+'</body></html>',base_url=str(out)).write_pdf(pdfpath)
pdf=fitz.open(pdfpath);extracted="\n".join(page.get_text() for page in pdf)
if not all(abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1 for page in pdf):
    raise ValueError("Non-A4")
bad=re.findall(r"[ก-๙]a[ก-๙]",extracted)
normalized_text=unicodedata.normalize("NFKC",extracted).replace("\u200b","").replace("\ufeff","")
queries={q:unicodedata.normalize("NFKC",q) in normalized_text
          for q in ("ดำเนินการ","ตำบล","อำนวยการ","จัดทำ","น้ำดื่ม")}
print("THAI_FONT_DEBUG",repr(extracted[:500]),"SAMPLE_NFKC",repr(normalized_text[:300]),"CHECKS",queries)
if bad or not all(queries.values()):
    raise ValueError("Font extraction failed: "+json.dumps({"bad":bad,"search":queries},ensure_ascii=False))
fonts=sorted({f[3] for page in pdf for f in page.get_fonts()})
qa={"pages":len(pdf),"source_lines":len(rendered),"sections":len(units),"A4":True,
    "stray_latin_a_in_thai":len(bad),"search_checks":queries,"fonts":fonts,
    "font_origin":"Full Sarabun from Google Fonts (OFL), not extracted subset",
    "status":"draft_preview_not_signed","sha256":hashlib.sha256(pdfpath.read_bytes()).hexdigest()}
(out/"announcement_fontfix_v2_qa.json").write_text(json.dumps(qa,ensure_ascii=False,indent=2)+"\n","utf-8")
selected=[0,len(pdf)//2,len(pdf)-1];pictures=[]
for i in selected:
    pix=pdf[i].get_pixmap(matrix=fitz.Matrix(1.1,1.1),alpha=False)
    im=Image.frombytes("RGB",[pix.width,pix.height],pix.samples);im.thumbnail((540,790));pictures.append(im)
board=Image.new("RGB",(sum(im.width for im in pictures)+160,max(im.height for im in pictures)+105),"#e8edf2")
draw=ImageDraw.Draw(board);x=40
for i,im in zip(selected,pictures):
    board.paste(im,(x,50));draw.text((x,18),"Page "+str(i+1),fill="#173b59");x+=im.width+40
board.save(out/"announcement_formal_preview_v2_contact.png")
print(json.dumps(qa,ensure_ascii=False,indent=2))
