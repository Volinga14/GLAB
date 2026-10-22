"""Build a PRIVATE development reference pack from GLAB, without editing GLAB.

Historical phase corrections and manual video-quality reviews remain distinct.
Nothing from this command belongs in the public repository.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from collections import Counter
from pathlib import Path, PureWindowsPath

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True, help='New private directory')
parser.add_argument('--negative-pack', type=Path, help='Optional private manifest containing a synthetic control')
parser.add_argument('--browser-previews', action='store_true', help='Keep MPEG-4 originals and add H.264 preview copies for the browser')
args = parser.parse_args()
source = args.source_root.resolve()
args.out.mkdir(parents=True, exist_ok=False)

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def locate(raw, identifier):
    candidates = []
    if raw:
        candidates.append(Path(raw))
        parts = PureWindowsPath(raw).parts
        for i, part in enumerate(parts):
            if part.lower() == source.name.lower():
                candidates.append(source.joinpath(*parts[i+1:]))
    for base in ['online-engine/data/videos', 'data/videos']:
        candidates.extend((source/base/(identifier+ext)) for ext in ['.mp4', '.mov', '.webm'])
    return next((p for p in candidates if p.is_file()), None)

def probe(path):
    command = ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
               'stream=codec_name,avg_frame_rate:format=duration:frame=best_effort_timestamp_time', '-of', 'json', str(path)]
    data = json.loads(subprocess.check_output(command, timeout=60))
    times = sorted(float(f['best_effort_timestamp_time']) for f in data.get('frames', []) if 'best_effort_timestamp_time' in f)
    duration = float(data['format']['duration'])
    gaps = [b-a for a, b in zip(times, times[1:])]
    average = sum(gaps)/len(gaps) if gaps else 0
    cfr = bool(average > 0 and all(abs(g-average) < 0.00001 for g in gaps))
    return duration, {'fps': 1/average if cfr else None, 'cfrVerified': cfr, 'source': 'ffprobe presentation timestamps', 'frameCount': len(times), 'codec': data.get('streams', [{}])[0].get('codec_name')}

combined = read(source/'data/neural/dataset_index_combined.json')
rows = combined if isinstance(combined, list) else combined['records']
qc_path = source/'data/neural/clip_qc/clip_qc.json'
qc = read(qc_path).get('items', {}) if qc_path.exists() else {}
manual = [value for value in qc.values() if value.get('manual')]
catalogue = {'sourceRecords': len(rows), 'sources': dict(Counter(r.get('source', 'unknown') for r in rows)),
             'qualityReviews': len(qc), 'manualQualityReviews': len(manual),
             'manualQualityStatuses': dict(Counter(r.get('status') for r in manual)),
             'policy': 'Existing GLAB material is development/regression data. No independent holdout claim. Manual quality approval is not phase-label approval.',
             'records': [{'id': r['video_id'], 'source': r.get('source'), 'split': r.get('split'), 'view': r.get('view'),
                          'qualityReview': qc.get(r['video_id'], {}).get('status'), 'qualityReviewedManually': bool(qc.get(r['video_id'], {}).get('manual')),
                          'historicalPhaseCorrections': r.get('source') == 'swinglab_legacy_import', 'holdoutEligible': False} for r in rows]}
records, skipped, hashes, duplicates = [], [], set(), []

def add(identifier, path, phases=None, negative=False, provenance=None):
    if path is None:
        skipped.append({'id': identifier, 'reason': 'Source video missing'})
        return
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if sha in hashes:
        existing = next(r for r in records if r['sha256'] == sha or r.get('sourceVideo', {}).get('sha256') == sha)
        existing.setdefault('sourceAliases', []).append(identifier)
        existing_marks = {p: mark['time'] for p, mark in existing['reference']['phases'].items()}
        conflict = (existing['reference']['status'] == 'negative') != negative or (not negative and existing_marks != phases)
        duplicates.append({'id': identifier, 'sameVideoAs': existing['id'], 'conflictingLabels': conflict})
        if conflict:
            existing.setdefault('alternativeHistoricalReferences', []).append({'sourceId': identifier, 'phases': phases, 'negative': negative})
            existing['reference']['status'] = 'draft'
            existing['reference']['notes'] += ' Other historical labels for this exact video disagree; reconcile them before confirmation.'
        return
    duration, timing = probe(path)
    if not 0 < duration <= 60:
        skipped.append({'id': identifier, 'reason': 'Outside the 60-second browser candidate limit'})
        return
    if not negative:
        names = ['address', 'takeaway', 'top', 'impact', 'finish']
        values = [phases.get(p) for p in names]
        if any(not isinstance(t, (int, float)) or not 0 <= t <= duration for t in values) or any(a >= b for a, b in zip(values, values[1:])):
            skipped.append({'id': identifier, 'reason': 'Historical phase labels require repair'})
            return
    file_name = identifier+path.suffix.lower()
    shutil.copy2(path, args.out/file_name)
    hashes.add(sha)
    source_video = None
    if args.browser_previews and timing.get('codec') == 'mpeg4':
        source_video = {'fileName': file_name, 'sha256': sha, 'conversion': 'H.264 browser preview; source unchanged, no intentional retiming. Keep both in the same source group.'}
        preview = args.out/(identifier+'-browser.mp4')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-copyts', '-start_at_zero', '-i', str(path), '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-an', str(preview)], check=True, timeout=120)
        file_name = preview.name
        sha = hashlib.sha256(preview.read_bytes()).hexdigest()
        duration, timing = probe(preview)
    records.append({'id': identifier, 'title': ('Control negativo GLAB ' if negative else 'Swing corregido GLAB ')+str(len(records)+1),
                    'fileName': file_name, 'sha256': sha, 'duration': duration, 'view': 'dtl', 'timing': timing,
                    'sourceReview': provenance, 'evaluationUse': 'development-only', 'holdoutEligible': False,
                    'reference': {'status': 'negative' if negative else 'draft', 'reviewer': 'GLAB manual quality review' if negative else '',
                                  'notes': 'No swing, explicitly reviewed in GLAB.' if negative else 'Historical human corrections. Confirm against protocol 1.0 before using as a reviewed phase reference.',
                                  'phases': {} if negative else {p: {'time': t, 'reason': ''} for p, t in phases.items() if p in ['address', 'takeaway', 'top', 'impact', 'finish']}},
                    'revisions': [], 'results': {}})
    if source_video:
        records[-1]['sourceVideo'] = source_video

for row in rows:
    if row.get('source') != 'swinglab_legacy_import':
        continue
    identifier = row['video_id']
    corrected = []
    for folder in ['data/training', 'online-engine/data/training']:
        training = source/folder/(identifier+'.training.json')
        if training.exists():
            corrected.append(read(training).get('corrected_phases', {}))
    phases = corrected[0] if corrected else row.get('phases_5', {})
    if any(value != phases for value in corrected[1:]) or (row.get('phases_5') and row['phases_5'] != phases):
        skipped.append({'id': identifier, 'reason': 'Conflicting historical labels; reconcile before use'})
        continue
    add(identifier, locate(row.get('video_path'), identifier), phases,
        provenance={'kind': 'historical-phase-correction', 'source': row.get('source'), 'protocolAlignment': 'pending', 'qualityReview': qc.get(identifier, {}).get('status')})
    if records and records[-1]['id'] == identifier:
        records[-1]['view'] = row.get('view', 'unknown')

for item in manual:
    if item.get('status') == 'no_swing':
        identifier = item.get('video_id') or item['key']
        add(identifier, locate(item.get('video_path'), identifier), negative=True,
            provenance={'kind': 'manual-negative-video-review', 'updatedAt': item.get('updated_at')})

if args.negative_pack:
    for record in read(args.negative_pack).get('records', []):
        if record.get('reference', {}).get('status') == 'negative' and record['id'] == 'negative-no-swing':
            path = args.negative_pack.parent/record['fileName']
            add(record['id'], path if path.exists() else None, negative=True, provenance={'kind': 'synthetic-control'})
            if records and records[-1]['id'] == record['id']:
                records[-1]['results'] = record.get('results', {})

pack = {'schema': 1, 'protocol': 'swing-phases/1.0', 'purpose': 'PRIVATE historical references for development. No data is published. Existing labels require protocol alignment.', 'records': records}
(args.out/'manifest.json').write_text(json.dumps(pack, indent=2), encoding='utf-8')
catalogue.update({'preparedPhaseReferences': sum(r['reference']['status']=='draft' for r in records), 'preparedNegativeControls': sum(r['reference']['status']=='negative' for r in records), 'duplicates': duplicates, 'skipped': skipped})
(args.out/'corpus-inventory.json').write_text(json.dumps(catalogue, indent=2), encoding='utf-8')
print(json.dumps({key: value for key, value in catalogue.items() if key not in ['records', 'skipped']}, indent=2))
print('Skipped:', len(skipped))
