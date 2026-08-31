import re
def rel_lum(c):
    m = re.match(r"^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$", c)
    r=int(m.group(1),16)/255; g=int(m.group(2),16)/255; b=int(m.group(3),16)/255
    def lin(x):
        return x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)

def contrast(fg,bg):
    lf=rel_lum(fg); lb=rel_lum(bg)
    hi=max(lf,lb); lo=min(lf,lb)
    return (hi+0.05)/(lo+0.05)

bg="#FAFAF8"
target=4.5
candidates=[]
print("=== Vermelhos da família Arcádia que passam 4.5:1 em #FAFAF8 ===")
# family around #E8563F (r=232,g=86,b=63) and #F2564B (r=242,g=86,b=75)
# try descending red ramp
for rv in range(60, 235, 5):
    for gv in range(20, 95, 10):
        for bv in range(10, 65, 8):
            if gv > rv*0.5 or bv > rv*0.4:
                continue
            h=f"#{rv:02x}{gv:02x}{bv:02x}"
            c=contrast(h,bg)
            if c>=target:
                candidates.append((h, c, rv, gv, bv))
                if len(candidates) <= 30:
                    print(f"  {h}  luminance={rel_lum(h):.4f}  contrast={c:.2f}:1  (R{rv} G{gv} B{bv})")

print(f"\nTotal candidates found: {len(candidates)}")
if candidates:
    # prefer ones closest to E8563F hue (R high, G and B low, G>B)
    egray=232; egreen=86; eblue=63
    scored=sorted(candidates, key=lambda x: abs(x[2]-egray)+abs(x[3]-egreen)+abs(x[4]-eblue))
    print("\nTop 8 closest to #E8563F family:")
    for h,c,rv,gv,bv in scored[:8]:
        print(f"  {h}  contrast={c:.2f}:1  (R{rv} G{gv} B{bv})")

# Also check what a pure ramp from #F2564B looks like
print("\n=== Chain from #F2564B down to pass ===")
for rv,gv,bv in [(242,86,75),(230,80,68),(218,74,62),(206,68,56),(194,62,50),(182,56,44),(170,50,38),(158,44,32),(146,38,26),(134,32,20),(122,26,16)]:
    h=f"#{rv:02x}{gv:02x}{bv:02x}"
    print(f"  {h}  lum={rel_lum(h):.4f}  contrast={contrast(h,bg):.2f}:1")
