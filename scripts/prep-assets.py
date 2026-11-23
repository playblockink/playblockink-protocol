"""One-off asset prep. Reads brand/ transparent PNG, writes src/assets/*.
Premultiplied-alpha resize (source has pure-black RGB under alpha=0, so a straight
resize would halo). Run: python scripts/prep-assets.py"""
from PIL import Image
import numpy as np, collections
SRC='brand/LOGO PLAYBLOCK PNG...png'
im=Image.open(SRC).convert('RGBA')
def premul_resize(img,size):
    a=np.asarray(img).astype('float64'); al=a[...,3:4]/255
    pm=np.concatenate([a[...,:3]*al,a[...,3:4]],axis=2)
    src=Image.fromarray(pm.round().clip(0,255).astype('uint8'),'RGBA') if False else None
    chans=[Image.fromarray(pm[...,i].astype('float32'),'F').resize(size,Image.LANCZOS) for i in range(4)]
    o=np.stack([np.asarray(c) for c in chans],axis=2)
    A=o[...,3:4]; rgb=np.where(A>0.5,o[...,:3]/np.maximum(A/255,1e-6),0)
    out=np.concatenate([rgb,A],axis=2).round().clip(0,255).astype('uint8')
    return Image.fromarray(out,'RGBA')
pad=24
word=im.crop((400-pad,863-pad,1604+pad,1133+pad))
w,h=word.size
premul_resize(word,(960,round(960*h/w))).save('src/assets/logo.png',optimize=True)
premul_resize(word,(480,round(480*h/w))).save('src/assets/logo-sm.png',optimize=True)
cube=im.crop((858-6,864-6,1110+7,1131+7))
cw,ch=cube.size
premul_resize(cube,(256,round(256*ch/cw))).save('src/assets/logo-cube.png',optimize=True)
# palette provenance
px=np.asarray(im.crop((858,864,1111,1132))).reshape(-1,4)
op=px[px[:,3]>=200][:,:3]
c=collections.Counter(map(tuple,(op//8*8)))
print(c.most_common(6))
for lo,name in (((40,150,40),'bright'),):pass
def mean(mask): return tuple(int(v) for v in op[mask].mean(0))
g=(op[:,1]>150)&(op[:,0]<90); d=(op[:,1]>50)&(op[:,1]<100)&(op[:,0]<30)
print('bright',mean(g),'dark',mean(d))
ink=np.asarray(im.crop((400,863,820,1133))).reshape(-1,4); ink=ink[ink[:,3]>=200][:,:3]; print('ink',tuple(int(v) for v in ink.mean(0)))
bg=np.asarray(Image.open('brand/LOGO PLAYBLOCK PNG.png').convert('RGB').crop((0,0,100,100))).reshape(-1,3); print('paper',tuple(int(v) for v in bg.mean(0)))
# favicon: 32x32 of the cube, quantised to 4 palette colours, run-length rects
S=32; sq=max(cube.size); canvas=Image.new('RGBA',(sq,sq),(0,0,0,0)); canvas.paste(cube,((sq-cube.size[0])//2,(sq-cube.size[1])//2))
small=premul_resize(canvas,(S,S)); sa=np.asarray(small)
pal={'g':mean(g),'d':mean(d)}
rows=[]; 
def near(p):
    best=None;bd=1e9
    for k,v in pal.items():
        dd=sum((int(p[i])-v[i])**2 for i in range(3))
        if dd<bd:bd,best=dd,k
    return best
grid=[[None if sa[y,x,3]<110 else near(sa[y,x]) for x in range(S)] for y in range(S)]
hx={k:'#%02x%02x%02x'%v for k,v in pal.items()}
out=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">','<!-- traced from 32x32 resample of brand/LOGO PLAYBLOCK PNG...png cube; colours sampled from asset -->']
for y in range(S):
    x=0
    while x<S:
        k=grid[y][x]
        if k is None: x+=1; continue
        x2=x
        while x2<S and grid[y][x2]==k: x2+=1
        out.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{hx[k]}"/>'); x=x2
out.append('</svg>')
open('src/assets/favicon.svg','w').write('\n'.join(out)); print(hx,len(out))
