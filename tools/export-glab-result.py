"""Run an existing GLAB runtime and emit a fingerprinted, importable lab result."""
import argparse, hashlib, json, sys
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--runtime',required=True,type=Path)
parser.add_argument('--video',required=True,type=Path)
parser.add_argument('--checkpoint',type=Path)
parser.add_argument('--out',required=True,type=Path)
args=parser.parse_args()
sys.dont_write_bytecode=True
sys.path.insert(0,str(args.runtime.resolve()))
from swinglab_v3.neural_engine.inference.analyzer import analyze_video_neural
checkpoint=args.checkpoint or args.runtime/'data/models/neural/CURRENT_BEST_GOLFDB_DTL.pt'
result=analyze_video_neural(args.video,checkpoint,num_frames=48,image_size=144,device='cpu')
def safe(value):
    import numpy as np
    if isinstance(value,np.generic):return value.item()
    if isinstance(value,np.ndarray):return value.tolist()
    if isinstance(value,Path):return str(value)
    raise TypeError(type(value).__name__)
result.pop('video_path',None);result.pop('checkpoint',None)
result['checkpointSha256']=hashlib.sha256(checkpoint.read_bytes()).hexdigest()
payload={'schema':1,'protocol':'swing-phases/1.0','sha256':hashlib.sha256(args.video.read_bytes()).hexdigest(),'result':result}
args.out.parent.mkdir(parents=True,exist_ok=True)
args.out.write_text(json.dumps(payload,indent=2,default=safe),encoding='utf-8')
print(args.out)
