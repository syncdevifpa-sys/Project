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

def best_fg_for(bg, target=4.5, max_lum=None, darker=True):
    """Scan grayscale that passes target on bg, return darkest/lightest candidate."""
    lb=rel_lum(bg)
    # fg luminance needed for contrast = target
    # (max(lf,lb)+0.05)/(min(lf,lb)+0.05) >= target
    # case 1: fg darker than bg -> lf < lb
    # (lb+0.05)/(lf+0.05) >= target -> lf <= (lb+0.05)/target - 0.05
    lf_max = (lb+0.05)/target - 0.05
    if lf_max < 0: lf_max = 0
    print(f"  bg={bg} lum={lb:.4f}  max fg lum for {target}:1 = {lf_max:.4f}")
    # pick a gray at ~80% of lf_max for margin
    pick = lf_max * 0.80
    # convert luminance to linear sRGB, then to 8-bit gray
    def lum_to_lin(lum):
        # invert: given luminance Y, find linear sRGB value X (gray)
        # Y = 0.2126*Rlin + 0.7152*Glin + 0.0722*Blin, all equal for gray => Y = X
        return lum
    X = pick
    def lin_to_srgb(x):
        return 1.055*(x**(1/2.4)) - 0.055 if x>0.0031308 else 12.92*x
    s = lin_to_srgb(X)
    v = max(0, min(255, round(s*255)))
    hexv = f"#{v:02x}{v:02x}{v:02x}"
    print(f"    -> gray luminance {pick:.4f} -> sRGB {s:.4f} -> #{v:02x}{v:02x}{v:02x}  contrast={contrast(hexv,bg):.2f}:1")
    return hexv

# 1. Eyebrow/micro on papel (#FAFAF8) — needs 4.5:1
print("=== Replacement for #9A99A5 (eyebrow default) ===")
print("Current: #9A99A5 on #FAFAF8 = %.2f:1  %s" % (contrast("#9A99A5","#FAFAF8"), "FAIL" if contrast("#9A99A5","#FAFAF8")<4.5 else "OK"))
print("Also on bloco #F1F1ED:")
print("  #9A99A5 on #F1F1ED = %.2f:1  %s" % (contrast("#9A99A5","#F1F1ED"), "FAIL" if contrast("#9A99A5","#F1F1ED")<4.5 else "OK"))
print("\nCandidate eyebrow colors (grayscale, pass 4.5:1 on papel):")
c1 = best_fg_for("#FAFAF8", 4.5)

# 2. Placeholder on marfim (#FAF9F5) — needs 4.5:1
print("\n=== Replacement for #A9A9A6 (placeholder) ===")
print("Current: #A9A9A6 on #FAF9F5 = %.2f:1  %s" % (contrast("#A9A9A6","#FAF9F5"), "FAIL" if contrast("#A9A9A6","#FAF9F5")<4.5 else "OK"))
c2 = best_fg_for("#FAF9F5", 4.5)

# 3. Vermelho-texto link-sub on papel — needs 4.5:1
print("\n=== Replacement for #F2564B (link-sub) ===")
print("Current: #F2564B on #FAFAF8 = %.2f:1  %s" % (contrast("#F2564B","#FAFAF8"), "FAIL" if contrast("#F2564B","#FAFAF8")<4.5 else "OK"))
# find a red that passes — try lowering blue/green
def try_red(r,g,b):
    h = f"#{r:02x}{g:02x}{b:02x}"
    c = contrast(h, "#FAFAF8")
    return h, c
# search near #E8563F family but darker
print("Scanning reds that pass 4.5:1 on papel:")
best=None
for rv in range(100, 230):
    for gv in range(30, 120):
        bv = int(gv*0.5)
        h,c = try_red(rv, gv, bv)
        if c >= 4.5:
            if best is None or c < best[1]:
                best=(h,c)
                # stop when we find one close to target
                if c < 4.8: 
                    break
    if best and best[1] < 4.8:
        break
print(f"  Best red near target: {best}")

# 4. Pills target size check
print("\n=== Pill target size (portal filtro + cadastro vínculo) ===")
print("Current pill in style.css: padding 10px 18px, font-size 10.5px")
print("  Height ~ 10+10+11 = 31px (well under 48pt=64px; under 44px AAA; under 24px? no, passes 24px AA)")
print("  Gap in .filtros = 8px (under 8pt=11px AA min between adjacent targets)")
print("  Gap in .pills (cadastro) = 12px (passes 8pt between adjacent)")
print("  Recommendation: increase portal filtro pills to padding 14px 22px (height ~39px) + gap 12px")
print("  For cadastro vínculo pills (desktop): 14px 22px padding = ~39px, acceptable for mouse; bump to 16px 24px for mobile")
