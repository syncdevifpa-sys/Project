import re
from collections import Counter

with open("/home/renzo/syncdevifpa-sys/front/landing.css", encoding="utf-8") as f:
    landing = f.read()
with open("/home/renzo/syncdevifpa-sys/front/style.css", encoding="utf-8") as f:
    style = f.read()
css = landing + "\n" + style

# ---- font-size (incl. clamp inner) ----
fs = re.findall(r"font-size\s*:\s*([^;{]+);", css)
sizes = []
for v in fs:
    v = v.strip()
    if "clamp(" in v:
        for m in re.findall(r"([\d.]+(?:px|rem|vw|em))", v):
            sizes.append(m)
    else:
        sizes.append(v)

# ---- font-weight ----
fw = re.findall(r"font-weight\s*:\s*([^;{]+);", css)
fw = [x.strip() for x in fw]

# ---- colors: hex in declarations, plus root tokens, plus inline svg fill ----
color_pat = re.compile(
    r"color\s*:\s*(#[0-9A-Fa-f]{3,8})\b|"
    r"background(?:-color)?\s*:\s*(#[0-9A-Fa-f]{3,8})\b|"
    r"--[^:\s]+:\s*(#[0-9A-Fa-f]{3,8})\b|"
    r"fill\s*:\s*(#[0-9A-Fa-f]{3,8})\b"
)
colors = set()
for m in color_pat.findall(css):
    for g in m:
        if g:
            c = g
            if len(c) == 4:
                try:
                    r=int(c[1],16); g2=int(c[2],16); b=int(c[3],16)
                    c = f"#{r*17:02x}{g2*17:02x}{b*17:02x}"
                except: pass
            colors.add(c)

# ---- border-radius ----
rr = re.findall(r"border-radius\s*:\s*([^;{]+);", css)
rr = [x.strip() for x in rr]

# ---- spacing: padding/margin/gap ----
pad = re.findall(r"padding(?:-top|-right|-bottom|-left)?\s*:\s*([^;{]+);", css)
mar = re.findall(r"margin(?:-top|-right|-bottom|-left)?\s*:\s*([^;{]+);", css)
gap = re.findall(r"gap\s*:\s*([^;{]+);", css)
sp_set = set(x.strip() for x in pad + mar + gap)

def rel_lum(c):
    m = re.match(r"^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$", c)
    if not m: return None
    r=int(m.group(1),16)/255; g=int(m.group(2),16)/255; b=int(m.group(3),16)/255
    def lin(x):
        return x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)

def contrast(fg,bg):
    lf=rel_lum(fg); lb=rel_lum(bg)
    if lf is None or lb is None: return None
    hi=max(lf,lb); lo=min(lf,lb)
    return (hi+0.05)/(lo+0.05)

print("=== PASS 1: system token inventory ===")
print("\n--- distinct font-size values ---")
c=Counter(sizes)
for k,v in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])):
    print(f"  {k:14s} x{v}")
print(f"  TOTAL: {len(c)} distinct values")

print("\n--- distinct font-weight values ---")
c=Counter(fw)
for k,v in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])):
    print(f"  {k:12s} x{v}")
print(f"  TOTAL: {len(c)} distinct values")

print("\n--- distinct colors (hex) ---")
cs=sorted(colors, key=lambda x: (len(x), x))
for c in cs:
    print(f"  {c}")
print(f"  TOTAL: {len(cs)} distinct values")

print("\n--- distinct border-radius values ---")
c=Counter(rr)
for k,v in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])):
    print(f"  {k:22s} x{v}")
print(f"  TOTAL: {len(c)} distinct values")

print("\n--- distinct spacing strings (padding/margin/gap) ---")
ss=sorted(sp_set, key=lambda s: s)
for s in ss:
    print(f"  {s}")
print(f"  TOTAL: {len(ss)} distinct values")

print("\n\n=== PASS 2: contrast checks (WCAG 2.1) ===")
pairs = [
    ("#9A99A5", "#FAFAF8", "micro/label default on papel"),
    ("#9A99A5", "#F1F1ED", "micro on bloco (inputs, cards)"),
    ("#A9A9A6", "#FAF9F5", "input placeholder on marfim"),
    ("#A9A9A6", "#10141A", "apoio-escuro text on tinta card"),
    ("#82827F", "#141413", "sidebar micro on preto background"),
    ("#82827F", "#FAFAF8", "rodape-tema on papel"),
    ("#5A6068", "#FAFAF8", "apoio on papel"),
    ("#A6A5AF", "#F1F1ED", "projeto-mini autor on bloco"),
    ("#A2A4A5", "#20262F", "pill inactive color on pill bg"),
    ("#10141A", "#FAF9F5", "tinta text on marfim"),
    ("#10141A", "#F1F1ED", "tinta on bloco"),
    ("#F2564B", "#FAFAF8", "vermelho-texto link-sub on papel"),
    ("#2B3FD9", "#FAFAF8", "tom-azul heading on papel"),
    ("#5B4BB5", "#FAFAF8", "tom-violeta heading on papel"),
    ("#E8563F", "#FAFAF8", "brand vermelho on papel"),
    ("#FAF9F5", "#10141A", "marfim text on tinta (btn-tinta)"),
    ("#FAF9F5", "#141413", "marfim text on preto"),
    ("#C8C3DC", "#10141A", "lavanda text on tinta"),
    ("#9A99A5", "#10141A", "breadcrumb micro on tinta bg?"),
    ("#3A3F47", "#FAFAF8", "detalhe > p on papel"),
    ("#ECECE6", "#10141A", "hover bloco bg tint on tinta?"),
    ("#20262F", "#FAF9F5", "pill inactive bg on marfim text"),
    ("#A9A9A6", "#FAF9F5", "placeholder on marfim"),
    ("#5A6068", "#F1F1ED", "doc span on bloco"),
    ("#10141A", "#EFEBFB", "tinta on lilas"),
    ("#5A6068", "#F7F0DC", "evento-tag tx on evento-bg?"),
    ("#44508F", "#E8ECF7", "matricula-tx on matricula-bg"),
    ("#3E6B4A", "#E5EDE4", "edital-tx on edital-bg"),
    ("#8A6D1B", "#F7F0DC", "evento-tx on evento-bg"),
    ("#A03B31", "#F7E3E1", "cancelamento-tx on cancelamento-bg"),
    ("#5A6068", "#EBE8E0", "documento-tx on documento-bg"),
]
for fg,bg,desc in pairs:
    r=contrast(fg,bg)
    ok=""
    if r is not None:
        if r>=4.5: ok="AA text"
        elif r>=3.0: ok="AA large/UI"
        else: ok="FAIL"
    print(f"  {fg} on {bg:10s}  {r if r else 'n/a':>6}  {ok:12s}  {desc}")
