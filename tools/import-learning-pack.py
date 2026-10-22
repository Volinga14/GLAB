"""Validate a local app feedback ZIP and prepare a private training index. No training."""
import argparse
import hashlib
import json
import re
import shutil
import stat
import zipfile
from pathlib import Path, PurePosixPath

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pack', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True, help='New private output directory')
parser.add_argument('--video-dir', type=Path, help='Optional source videos, located by SHA-256')
args = parser.parse_args()
protocol = 'swing-phases/1.0'
names = ['Address', 'Takeaway', 'Top', 'Impact', 'Finish']

with zipfile.ZipFile(args.pack) as archive:
    files = archive.infolist()
    if len(files) > 20000 or sum(f.file_size for f in files) > 2*1024**3:
        raise ValueError('Feedback archive exceeds the import limits')
    seen = set()
    for item in files:
        p = PurePosixPath(item.filename)
        reserved = {'CON', 'PRN', 'AUX', 'NUL', *('COM'+str(i) for i in range(1,10)), *('LPT'+str(i) for i in range(1,10))}
        if item.filename in seen or not re.fullmatch(r'[A-Za-z0-9_./-]+', item.filename) or any(part.split('.')[0].upper() in reserved for part in p.parts) or p.is_absolute() or '..' in p.parts or stat.S_ISLNK(item.external_attr >> 16):
            raise ValueError('Unsafe or duplicate archive path')
        seen.add(item.filename)
    if archive.getinfo('manifest.json').file_size > 20*1024**2:
        raise ValueError('Feedback manifest exceeds the import limit')
    manifest = json.loads(archive.read('manifest.json'))
    if manifest.get('schema') != 1 or manifest.get('kind') != 'swinglab-learning-pack' or manifest.get('protocol') != protocol or not isinstance(manifest.get('records'), list):
        raise ValueError('Unsupported feedback protocol')
    args.out.mkdir(parents=True, exist_ok=False)
    for item in files:
        if item.is_dir():
            continue
        destination = args.out.joinpath(*PurePosixPath(item.filename).parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(item) as src, destination.open('wb') as dst:
            shutil.copyfileobj(src, dst)

def resolve_export_path(raw):
    p = PurePosixPath(raw)
    if p.is_absolute() or '..' in p.parts or '\\' in raw or re.match(r'^[A-Za-z]:', raw):
        raise ValueError('Unsafe manifest path')
    candidate = args.out.joinpath(*p.parts)
    if not candidate.is_file():
        raise ValueError('A file referenced by the manifest is missing')
    return candidate

expected_hashes = {r.get('videoSha256') for r in manifest['records'] if re.fullmatch(r'[a-f0-9]{64}', r.get('videoSha256') or '')}
def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

originals = {}
if args.video_dir:
    for path in args.video_dir.rglob('*'):
        if path.is_file() and path.suffix.lower() in ['.mp4', '.mov', '.m4v', '.webm']:
            digest = file_hash(path)
            if digest in expected_hashes:
                originals[digest] = path.resolve()

records, problems, phase_sets, identifiers = [], [], {}, set()
for row in manifest['records']:
    identifier = row.get('id')
    if not isinstance(identifier, str) or not re.fullmatch(r'[-\w]{1,100}', identifier) or identifier in identifiers:
        raise ValueError('Invalid review identifier')
    identifiers.add(identifier)
    digest = row.get('videoSha256')
    review = row.get('review') or {}
    phases = row.get('phases') or {}
    duration = row.get('duration')
    valid = isinstance(duration, (float, int)) and not isinstance(duration, bool) and 0 < duration <= 600
    previous = -1
    for phase in names:
        value = phases.get(phase)
        valid = valid and isinstance(value, (float, int)) and not isinstance(value, bool) and previous < value <= duration
        if isinstance(value, (float, int)):
            previous = value
    confirmed = bool(valid and digest in expected_hashes and review.get('status') == 'reviewed' and review.get('protocol') == protocol and review.get('videoSha256') == digest and review.get('phases') == phases and review.get('reviewer') and review.get('confirmedAt'))
    negative = bool(not phases and digest in expected_hashes and review.get('status') == 'negative' and review.get('protocol') == protocol and review.get('videoSha256') == digest and review.get('reviewer') and review.get('confirmedAt'))
    video = originals.get(digest)
    if row.get('videoPath'):
        video = resolve_export_path(row['videoPath'])
    if video and file_hash(video) != digest:
        raise ValueError('Original video SHA-256 does not match its labels')
    images = []
    for image in row.get('contextImages', []):
        image_path = resolve_export_path(image['path'])
        with image_path.open('rb') as handle:
            if handle.read(2) != b'\xff\xd8':
                raise ValueError('Context preview is not a JPEG')
        images.append({**image, 'path': str(image_path.resolve())})
    events = {'address': phases.get('Address'), 'toe_up': phases.get('Takeaway'), 'mid_backswing': None, 'top': phases.get('Top'), 'mid_downswing': None, 'impact': phases.get('Impact'), 'mid_follow_through': None, 'finish': phases.get('Finish')}
    records.append({'video_id': identifier, 'source': 'swinglab_app_feedback', 'video_path': str(video.resolve()) if video else None,
                    'sha256': digest, 'view': row.get('view'), 'protocol': protocol, 'duration': duration, 'phases_5': {p.lower(): phases.get(p) for p in names}, 'events_8': events,
                    'humanConfirmed': confirmed or negative, 'validityLabel': 'no-swing' if negative else 'swing' if confirmed else 'unconfirmed', 'eligibleForGlobalTraining': bool(confirmed and video and row.get('view')=='DTL'), 'eligibleForValidityTraining': bool((confirmed or negative) and video), 'eligibleForIndependentEvaluation': False,
                    'split': 'unassigned', 'groupingRequired': 'Group by original recording and player; SHA alone does not detect re-encodes.',
                    'corrections': row.get('corrections', []), 'modelRuns': row.get('analyses', []), 'contextImages': images,
                    'contextUse': 'Review previews. Re-extract source frames from the original for global training or unverified decoder timestamps.'})
    if confirmed:
        phase_sets.setdefault(digest, []).append((identifier, phases))
    if not video:
        problems.append({'id': identifier, 'reason': 'Original video absent; context-only export remains useful for review, not full-sequence training'})
    if confirmed and row.get('view') != 'DTL':
        problems.append({'id': identifier, 'reason': 'Phase data belongs to a separate view cohort; the current marker is DTL-only'})

for digest, group in phase_sets.items():
    if any(marks != group[0][1] for _, marks in group[1:]):
        for record in records:
            if record['sha256'] == digest:
                record['eligibleForGlobalTraining'] = False
                problems.append({'id': record['video_id'], 'reason': 'Conflicting confirmed labels for the same original; reconcile before training'})
    elif len(group) > 1:
        for record in records:
            if record['sha256'] == digest and record['video_id'] != group[0][0]:
                record['eligibleForGlobalTraining'] = False
                record['duplicateOf'] = group[0][0]

for digest in expected_hashes:
    matching = [r for r in records if r['sha256']==digest and r['humanConfirmed']]
    if len({r['validityLabel'] for r in matching}) > 1:
        for record in matching:
            record['eligibleForGlobalTraining'] = record['eligibleForValidityTraining'] = False
            problems.append({'id': record['video_id'], 'reason': 'Conflicting swing/no-swing labels for the same source'})

index = {'schema': 1, 'protocol': protocol, 'policy': 'Private staging only. No automatic training. Freeze recording/player groups and an independent evaluation set before promotion.', 'records': records, 'problems': problems}
(args.out/'training-index.json').write_text(json.dumps(index, indent=2), encoding='utf-8')
print(json.dumps({'reviews': len(records), 'humanConfirmed': sum(r['humanConfirmed'] for r in records), 'withVerifiedOriginal': sum(bool(r['video_path']) for r in records), 'eligibleForGlobalTraining': sum(r['eligibleForGlobalTraining'] for r in records), 'eligibleForValidityTraining': sum(r['eligibleForValidityTraining'] for r in records), 'problems': len(problems)}, indent=2))
