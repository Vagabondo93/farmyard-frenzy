# Striscia di N fotogrammi -> sprite sheet trasparente per ANIM (index.html).
# uso: [WHITE=248] python3 sheet.py input output.webp N modo
#   modo: center (ogni fotogramma centrato su sé stesso: camminate), cell (allineati al primo: attacchi con affondo),
#         right (allineati sul bordo destro: volanti), cellright (allineati al bordo destro del primo)
#   WHITE: soglia del bianco dello sfondo (228 di default; 248 per personaggi color crema o bianchi)
# Regola: mai tagliare in celle uguali. Ogni pezzo (forma collegata) va per intero al fotogramma più vicino al suo centro.
import sys,os,json
from PIL import Image,ImageFilter
import numpy as np
import scipy.ndimage as nd
src,dst,N=sys.argv[1],sys.argv[2],int(sys.argv[3]);mode=sys.argv[4] if len(sys.argv)>4 else 'center'
WT=int(os.environ.get('WHITE','228'));BASE=int(os.environ.get('BASE','128'))
im=Image.open(src).convert('RGBA');A=np.array(im).astype(int);H,W=A.shape[:2]
if A[:,:,3].min()<10: ink=A[:,:,3]>40;white=np.zeros_like(ink)
else:
    c=A[:,:,:3];white=(c.min(axis=2)>WT)&((c.max(axis=2)-c.min(axis=2))<(20 if WT<240 else 8))
    lab,n=nd.label(white);border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    ink=~np.isin(lab,list(border))
pl,pn=nd.label(ink);sz=nd.sum(ink,pl,range(1,pn+1));com=nd.center_of_mass(ink,pl,range(1,pn+1))
big=max(sz);owner={}
for k in range(pn):
    if sz[k]<max(40,big*.002): continue
    owner.setdefault(min(N-1,int(com[k][1]/(W/N))),[]).append(k+1)
frames=[];boxes=[]
for i in range(N):
    m=np.isin(pl,owner.get(i,[]))
    ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    # buchi bianchi chiusi: via quelli tra le zampe (in basso), vicino alla coda (a sinistra) o grandi e bianchissimi; gli occhi restano
    hl,hn=nd.label(white&m)
    for k in range(1,hn+1):
        r=hl==k;z=r.sum()
        if z<60: continue
        yy,xx=np.where(r);cy=(yy.mean()-y0)/max(1,y1-y0);cx=(xx.mean()-x0)/max(1,x1-x0)
        if cy>.6 or cx<.22 or (z>1500 and A[:,:,:3][r].mean()>251): m&=~r
    al=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.8))
    if A[:,:,3].min()<10: al=Image.fromarray(np.minimum(np.array(al),A[:,:,3].astype(np.uint8)))
    rgba=im.copy();rgba.putalpha(al);frames.append(rgba);boxes.append((x0,y0,x1+1,y1+1))
cw=W/N  # nei modi "cell" il punto d'aggancio è la stessa posizione dentro ogni cella del foglio
if mode=='cell': anc=[(boxes[0][0]+boxes[0][2])/2+i*cw for i in range(N)]
elif mode=='right': anc=[b[2] for b in boxes]
elif mode=='cellright': anc=[boxes[0][2]+i*cw for i in range(N)]
else: anc=[(b[0]+b[2])/2 for b in boxes]
# ogni fotogramma resta nella sua posizione verticale originale (piedi sulla stessa linea)
L=max(a-b[0] for a,b in zip(anc,boxes))+3;Rr=max(b[2]-a for a,b in zip(anc,boxes))+3
yt=min(b[1] for b in boxes)-3;yb=max(b[3] for b in boxes)+3
med=sorted(b[3]-b[1] for b in boxes)[N//2];s=float(os.environ['SCALE']) if os.environ.get('SCALE') else BASE/med  # SCALE: stessa scala di un altro foglio dello stesso personaggio
FW=round((L+Rr)*s);FH=round((yb-yt)*s)
out=Image.new('RGBA',(FW*N,FH),(0,0,0,0))
for i,(f,a) in enumerate(zip(frames,anc)):
    l=int(round(a-L));cr=f.crop((l,yt,l+int(L+Rr),yb)).resize((FW,FH),Image.LANCZOS);out.alpha_composite(cr,(i*FW,0))
out.save(dst,'WEBP',quality=86,method=6)
print(json.dumps({'n':N,'fw':FW,'fh':FH,'ax':round(L/(L+Rr),3),'scale':round(s,4)}))
