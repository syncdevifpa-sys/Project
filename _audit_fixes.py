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

# Fundos usados no produto
paper="#FAFAF8"
bloko="#F1F1ED"
marfim="#FAF9F5"
tinta="#10141A"
preto="#141413"

print("=== Escolha do token de substituição (eyebrow/label/placeholder/azulejo) ===")
print("Precisa passar 4.5:1 sobre papel, bloco e marfim.")
print("O token atual APOIO_ESCURO=%s tem:" % "#A9A9A6")
print("  sobre papel : %.2f:1  %s" % (contrast("#A9A9A6",paper), "OK" if contrast("#A9A9A6",paper)>=4.5 else "FAIL"))
print("  sobre bloco : %.2f:1  %s" % (contrast("#A9A9A6",bloko), "OK" if contrast("#A9A9A6",bloko)>=4.5 else "FAIL"))
print("  sobre marfim: %.2f:1  %s" % (contrast("#A9A9A6",marfim), "OK" if contrast("#A9A9A6",marfim)>=4.5 else "FAIL"))

# Scan cinza
print("\n--- candidatos cinza: contraste sobre papel, bloco, marfim ---")
cands=[]
for v in range(40, 130):
    hexv=f"#{v:02x}{v:02x}{v:02x}"
    cp=contrast(hexv,paper)
    cb=contrast(hexv,bloko)
    cm=contrast(hexv,marfim)
    ok = cp>=4.5 and cb>=4.5 and cm>=4.5
    cands.append((hexv,cp,cb,cm,ok,v))
    if ok:
        print(f"  {hexv}  papel={cp:.2f}  bloco={cb:.2f}  marfim={cm:.2f}  OK")

# escolha o com menor contraste sobre papel que ainda passa (mais brand suave)
ok_cands=[(hexv,cp,cb,cm,v) for hexv,cp,cb,cm,ok,v in cands if ok]
# prefer menores (mais suave) mas com margem
ok_cands_sorted=sorted(ok_cands, key=lambda x: x[4])  # menor v = mais escuro
print("\n--- os 5 mais sóbrios (maior valor de v, mais brand suave) que passam em todos ---")
for hexv,cp,cb,cm,v in ok_cands_sorted[-5:]:
    print(f"  {hexv}  papel={cp:.2f}  bloco={cb:.2f}  marfim={cm:.2f}  (v={v})")
# escolho o que tiver paper maior que 4.5 de margem razoavel
chosen=None
for hexv,cp,cb,cm,v in reversed(ok_cands_sorted):
    if cp>=5.0 and cb>=4.5 and cm>=5.0:
        chosen=hexv
        print(f"\n=> escolhido: {chosen}  papel={cp:.2f}  bloco={cb:.2f}  marfim={cm:.2f}")
        break
if not chosen:
    # fallback: o mais escuro que passa
    chosen=ok_cands_sorted[-1][0]
    cp=contrast(chosen,paper); cb=contrast(chosen,bloko); cm=contrast(chosen,marfim)
    print(f"\n=> fallback: {chosen}  papel={cp:.2f}  bloco={cb:.2f}  marfim={cm:.2f}")

print("\n\n=== Escolha do vermelho do link 'Esqueci a senha' ===")
print("Precisa passar 4.5:1 sobre papel (#FAFAF8).")
print("Atual: #F2564B -> %.2f:1 %s" % (contrast("#F2564B",paper), "FAIL" if contrast("#F2564B",paper)<4.5 else "OK"))
# encontrar vermelho da família arcádia que passa e que aparência seja vermelho
print("\n--- escaneando vermelhos que passam 4.5:1 sobre papel ---")
found=[]
for r in range(120, 246, 6):
    for g in range(20, 110, 10):
        b=int(g*0.6)
        if b > g: continue
        hexv=f"#{r:02x}{g:02x}{b:02x}"
        c=contrast(hexv,paper)
        if c>=4.5:
            found.append((hexv,r,g,b,c))
            if len(found)<30:
                print(f"  {hexv}  R{r} G{g} B{b}  contrast={c:.2f}:1")
# escolher mais perto de vermelho brilhante mas que passa
best=min(found, key=lambda x: (abs(x[1]-242)+abs(x[2]-86)+abs(x[3]-75)))
print(f"\n=> escolhido: {best[0]}  R{best[1]} G{best[2]} B{best[3]}  contrast={best[4]:.2f}:1")
print("  (mais próximo de #F2564B que passa)")
# verificar no bloco e marfim tb
print(f"  sobre bloco: {contrast(best[0],bloko):.2f}:1")
print(f"  sobre marfim: {contrast(best[0],marfim):.2f}:1")

print("\n\n=== Verificação final para os valores escolhidos ===")
if chosen:
    print(f"NOVO token APOIO_ESCURO: {chosen}")
    print(f"  sobre papel: {contrast(chosen,paper):.2f}:1  %s" % ("OK" if contrast(chosen,paper)>=4.5 else "FAIL"))
    print(f"  sobre bloco: {contrast(chosen,bloko):.2f}:1  %s" % ("OK" if contrast(chosen,bloko)>=4.5 else "FAIL"))
    print(f"  sobre marfim: {contrast(chosen,marfim):.2f}:1  %s" % ("OK" if contrast(chosen,marfim)>=4.5 else "FAIL"))
    print(f"  sobre tinta (para manual?): {contrast(chosen,tinta):.2f}:1")
    print(f"  sobre preto: {contrast(chosen,preto):.2f}:1")

if best:
    print(f"\nNOVO vermelho do link: {best[0]}")
    print(f"  sobre papel: {contrast(best[0],paper):.2f}:1  %s" % ("OK" if contrast(best[0],paper)>=4.5 else "FAIL"))
