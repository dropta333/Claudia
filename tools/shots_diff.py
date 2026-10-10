# Compara dos carpetas de capturas y lista las que cambian
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]; dif = 0
for f in sorted(os.listdir(a)):
    x, y = Image.open(os.path.join(a, f)).convert("RGB"), Image.open(os.path.join(b, f)).convert("RGB")
    if x.size != y.size: print("TAMAÑO", f, x.size, y.size); dif += 1; continue
    bb = ImageChops.difference(x, y).getbbox()
    if bb: print("CAMBIA", f, bb); dif += 1
print("iguales" if not dif else f"{dif} con cambios")
