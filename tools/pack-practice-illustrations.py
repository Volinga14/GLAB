"""Pack the 18 Blender key views as an offline, self-contained JS module."""
from pathlib import Path
from PIL import Image
import sys,io,base64,json
source=Path(sys.argv[1]);target=Path(sys.argv[2]);images={}
for number in range(1,7):
 drill='SL%02d'%number;images[drill]=[]
 for stage in range(3):
  im=Image.open(source/(drill+'-'+str(stage)+'.png')).convert('RGB');out=io.BytesIO();im.save(out,format='WEBP',quality=86,method=6)
  images[drill].append('data:image/webp;base64,'+base64.b64encode(out.getvalue()).decode())
payload={'version':'swinglab-teaching-views/2','provenance':'Original Blender teaching mannequins, not measured biomechanics. Rebuild with tools/render-practice-illustrations.py.', 'images':images}
target.write_text('/* Original SwingLab teaching illustrations, generated from the tracked Blender script. */\n(function(root,factory){const api=factory();if(typeof module===\"object\"&&module.exports)module.exports=api;else root.SwingLabPracticeIllustrations=api})(globalThis,()=>('+json.dumps(payload,separators=(',',':'))+'));\n')
print(target.name,target.stat().st_size,'bytes; 18 key views')
