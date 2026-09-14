"""Read the rendered share card's QR modules and decode its payload (no camera needed)."""
from pathlib import Path
from PIL import Image
from reportlab.graphics.barcode import qr,qrencoder
p=Path(__file__).resolve().parents[1]
source=qr.QrCodeWidget('https://fruitmergegame.net/');source.qr.make();n=source.qr.moduleCount
im=Image.open(p/'tests/share-render.png').convert('RGB')
# Image is drawn at (48, 926), 186 square, including 4 quiet modules.
def sample(row,col):
 x=48+(col+4+.5)*186/(n+8);y=926+(row+4+.5)*186/(n+8)
 return sum(im.getpixel((int(x),int(y))))<384
matrix=[[sample(r,c)for c in range(n)]for r in range(n)]
assert matrix==source.qr.modules,'Rendered QR pixels differ from encoder matrix'
# Recover the format bits from the image, then unmask data bits and parse byte mode.
format_bits=0
for i in range(15):
 row=i if i<6 else i+1 if i<8 else n-15+i
 format_bits|=int(matrix[row][8])<<i
fmt=next(i for i in range(32)if qrencoder.QRUtil.getBCHTypeInfo(i)==format_bits)
mask=qrencoder.QRUtil.getMask(fmt&7)
bits=[int(matrix[row][col]^mask(row,col)) for col,row in source.qr.dataPosIterator()]
def integer(start,count):return int(''.join(map(str,bits[start:start+count])),2)
assert integer(0,4)==4,'Expected byte mode'
length=integer(4,8);payload=bytes(integer(12+i*8,8)for i in range(length)).decode()
assert payload=='https://fruitmergegame.net/'
print('Rendered sharing QR decoded:',payload)
