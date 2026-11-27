# Ritaglia un foglio di icone in una griglia COLONNE x RIGHE.
# Regola: mai tagliare in celle uguali. Ogni figura si prende intera (con i pezzi staccati vicini: stelline, righe di movimento),
# anche se sconfina nella cella accanto; ogni pezzo va alla cella più vicina al suo centro.
# uso: python3 cutgrid.py immagine colonne righe nome1,nome2,... [buchi] [cartella]
#   buchi: nomi a cui togliere anche il bianco chiuso (es. i fori delle manette); cartella: dove salvare (default icons/st)
import sys
from PIL import Image,ImageFilter
import numpy as np, scipy.ndimage as nd
src,C,Rr,names=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4].split(',')
holes=set(sys.argv[5].split(',')) if len(sys.argv)>5 and sys.argv[5] else set();OUT=sys.argv[6] if len(sys.argv)>6 else 'icons/st'
im=Image.open(src).convert('RGB');W,H=im.size;A=np.array(im).astype(int)
white=(A.min(axis=2)>226)&((A.max(axis=2)-A.min(axis=2))<22)
lab,n=nd.label(white);border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(border));ink=~bg
pl,pn=nd.label(ink);objs=nd.find_objects(pl);psz=nd.sum(ink,pl,range(1,pn+1));com=nd.center_of_mass(ink,pl,range(1,pn+1))
cell={}
for k in range(pn):
    if psz[k]<40: continue
    cy,cx=com[k];c=min(C-1,int(cx/(W/C)));r=min(Rr-1,int(cy/(H/Rr)));cell.setdefault(r*C+c,[]).append(k+1)
for idx,name in enumerate(names):
    ks=cell.get(idx,[]);m=np.isin(pl,ks)
    if name in holes:
        hl,hn=nd.label(white&m);hs=nd.sum(np.ones_like(hl),hl,range(1,hn+1))
        for k,z in enumerate(hs,1):
            if z>120: m&=~(hl==k)
    ys,xs=np.where(m);x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    al=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    rgba=im.convert('RGBA');rgba.putalpha(al);cr=rgba.crop((x0,y0,x1,y1))
    S=128;k=120/max(cr.size);cr=cr.resize((round(cr.width*k),round(cr.height*k)),Image.LANCZOS)
    out=Image.new('RGBA',(S,S),(0,0,0,0));out.alpha_composite(cr,((S-cr.width)//2,(S-cr.height)//2))
    out.save(f'{OUT}/{name}.webp','WEBP',quality=88,method=6)
print('ok',len(names))
