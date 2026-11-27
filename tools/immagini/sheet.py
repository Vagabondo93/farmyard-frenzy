# uso: python3 sheet.py input output.webp N modo
# modo: center (ogni fotogramma centrato su sé stesso: camminate), cell (tutti allineati al primo: attacchi con affondo),
#       right (allineati sul bordo destro, cioè il muso: volanti con ali che cambiano molto)
# Toglie lo sfondo bianco, mette tutti i fotogrammi alla stessa scala (altezza tipica = 128 px) e stampa i dati per ANIM.
import sys,json
from PIL import Image,ImageFilter
import numpy as np
import scipy.ndimage as nd
src,dst,N=sys.argv[1],sys.argv[2],int(sys.argv[3]);mode=sys.argv[4] if len(sys.argv)>4 else 'center'
im=Image.open(src).convert('RGB');W,Hh=im.size;cw=W//N
# confini tra i fotogrammi: le N-1 colonne vuote più larghe (i generatori non fanno celle uguali)
A=np.array(im).astype(int);ink=(~((A.min(axis=2)>228)&((A.max(axis=2)-A.min(axis=2))<20))).sum(axis=0)>2
runs=[];x=0
while x<W:
    if not ink[x]:
        y=x
        while y<W and not ink[y]: y+=1
        if x>0 and y<W: runs.append((y-x,(x+y)//2))
        x=y
    else: x+=1
cuts=sorted(c for _,c in sorted(runs,reverse=True)[:N-1]);edges=[0]+cuts+[W]
if len(edges)!=N+1: edges=[i*cw for i in range(N)]+[W]
frames=[];boxes=[]
for i in range(N):
    c=np.array(im.crop((edges[i],0,edges[i+1],Hh))).astype(int);h,w,_=c.shape
    import os;WT=int(os.environ.get('WHITE','228'));white=(c.min(axis=2)>WT)&((c.max(axis=2)-c.min(axis=2))<(20 if WT<240 else 7))
    lab,n=nd.label(white);bg=np.zeros((h,w),bool)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    sz=nd.sum(np.ones_like(lab),lab,range(1,n+1))
    for k in border: bg|=lab==k
    # buchi bianchi chiusi: via quelli tra le zampe (in basso) o vicino alla coda (a sinistra); gli occhi (in alto a destra) restano
    ys,xs=np.where(~bg);by0,by1,bx0,bx1=ys.min(),ys.max(),xs.min(),xs.max()
    for k,z in enumerate(sz,1):
        if k in border or z<60: continue
        yy,xx=np.where(lab==k);cy=(yy.mean()-by0)/(by1-by0);cx=(xx.mean()-bx0)/(bx1-bx0)
        if cy>.6 or cx<.22: bg|=lab==k
    a=Image.fromarray(np.where(bg,0,255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.8))
    rgba=Image.fromarray(c.astype(np.uint8)).convert('RGBA');rgba.putalpha(a)
    am=np.array(a)>40
    # via i pezzetti staccati (sbavature, puntini)
    l2,n2=nd.label(am);s2=nd.sum(am,l2,range(1,n2+1));keep=np.isin(l2,[k+1 for k,z in enumerate(s2) if z>=max(s2)*.02])
    ys,xs=np.where(keep);boxes.append((xs.min(),ys.min(),xs.max()+1,ys.max()+1));frames.append(rgba)
if mode=='cell': anc=[(boxes[0][0]+boxes[0][2])/2]*N
elif mode=='cellright': anc=[boxes[0][2]]*N
elif mode=='right': anc=[b[2] for b in boxes]
else: anc=[(b[0]+b[2])/2 for b in boxes]
L=max(a-b[0] for a,b in zip(anc,boxes))+3;Rr=max(b[2]-a for a,b in zip(anc,boxes))+3
y0=min(b[1] for b in boxes)-3;y1=max(b[3] for b in boxes)+3
import os
med=sorted(b[3]-b[1] for b in boxes)[N//2];s=int(os.environ.get('BASE','128'))/med
FW=round((L+Rr)*s);FH=round((y1-y0)*s)
out=Image.new('RGBA',(FW*N,FH),(0,0,0,0))
for i,(f,a) in enumerate(zip(frames,anc)):
    l=int(round(a-L));cr=f.crop((l,y0,l+int(L+Rr),y1)).resize((FW,FH),Image.LANCZOS);out.alpha_composite(cr,(i*FW,0))
out.save(dst,'WEBP',quality=86,method=6)
print(json.dumps({'n':N,'fw':FW,'fh':FH,'ax':round(L/(L+Rr),3)}))
