"""Freeze GLAB weights as the browser candidate; never trains or edits GLAB."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--runtime', type=Path, required=True)
parser.add_argument('--checkpoint', type=Path)
parser.add_argument('--out', type=Path, required=True, help='New output directory')
args = parser.parse_args()
sys.dont_write_bytecode = True
sys.path.insert(0, str(args.runtime.resolve()))
import torch
import onnx
from swinglab_v3.neural_engine.inference.analyzer import load_checkpoint

checkpoint = args.checkpoint or args.runtime / 'data/models/neural/CURRENT_BEST_GOLFDB_DTL.pt'
model, config = load_checkpoint(checkpoint, device='cpu')
model.load_state_dict(torch.load(checkpoint, map_location='cpu')['model_state'], strict=True)
model.eval()
args.out.mkdir(parents=True, exist_ok=False)

class Temporal(torch.nn.Module):
    def __init__(self, base):
        super().__init__()
        self.temporal, self.head = base.temporal, base.head

    def forward(self, features):
        output, _ = self.temporal(features)
        return self.head(output)

temporal = Temporal(model).eval()
with torch.no_grad():
    torch.onnx.export(model.encoder, torch.zeros(1, 3, 144, 144), str(args.out / 'encoder.onnx'), input_names=['image'], output_names=['features'], opset_version=17, dynamo=False)
    torch.onnx.export(temporal, torch.zeros(1, 48, 96), str(args.out / 'temporal.onnx'), input_names=['features'], output_names=['logits'], opset_version=17, dynamo=False)
    image = ((torch.arange(3*144*144, dtype=torch.float32) % 97) / 97*2-1).reshape(1, 3, 144, 144)
    features = ((torch.arange(48*96, dtype=torch.float32) % 89) / 89*2-1).reshape(1, 48, 96)
    golden = {'encoder': model.encoder(image).flatten().tolist(), 'temporal': temporal(features).flatten().tolist()}
for name in ['encoder', 'temporal']:
    onnx.checker.check_model(onnx.load(str(args.out / (name + '.onnx'))))
metadata = {'protocol': 'swing-phases/1.0', 'checkpointSha256': hashlib.sha256(checkpoint.read_bytes()).hexdigest(), 'frames': 48, 'imageSize': 144, 'trainedSampling': {'frames': config.get('num_frames'), 'imageSize': config.get('image_size')}, 'files': {name: {'bytes': (args.out / (name + '.onnx')).stat().st_size, 'sha256': hashlib.sha256((args.out / (name + '.onnx')).read_bytes()).hexdigest()} for name in ['encoder', 'temporal']}}
(args.out / 'export.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
(args.out / 'onnx-golden.json').write_text(json.dumps(golden), encoding='utf-8')
print(json.dumps(metadata, indent=2))
