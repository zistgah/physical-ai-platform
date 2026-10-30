#!/usr/bin/env python3
# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# SPDX-License-Identifier: GPL-3.0-only
"""Validate notebook structure, notices, protocol, code syntax and local CPU references."""
from pathlib import Path
import ast, hashlib, json, sys, tempfile
try:
    import nbformat
except ImportError as exc:
    print('SKIP: nbformat is required for notebook validation:', exc)
    sys.exit(2)
ROOT=Path(__file__).resolve().parent
FILES=sorted(ROOT.glob('*.ipynb'))
COPY='Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.'
required=['AyeAI®','AyeAM®','AyeCNSe®']
errors=[]; checked_cells=0
for path in FILES:
    try:
        nb=nbformat.read(path,as_version=4); nbformat.validate(nb)
        if nb.metadata.get('pap',{}).get('license')!='GPL-3.0-only': raise ValueError('missing PAP GPL metadata')
        if COPY not in nb.cells[0].source: raise ValueError('opening copyright notice missing')
        if any(token not in nb.cells[0].source for token in required): raise ValueError('trademark notice missing')
        if not any(c.cell_type=='code' and 'PAP_JOB_SCHEMA' in c.source for c in nb.cells): raise ValueError('embedded job/result protocol missing')
        if not any(c.cell_type=='code' and COPY in c.source for c in nb.cells): raise ValueError('source-cell copyright missing')
        for i,cell in enumerate(nb.cells):
            if cell.cell_type!='code': continue
            checked_cells+=1
            source='\n'.join(line for line in cell.source.splitlines() if not line.lstrip().startswith(('%','!')))
            if source.strip(): ast.parse(source,filename=f'{path.name}:cell-{i}')
        print(f'PASS {path.name}: {len(nb.cells)} cells, metadata/notices/protocol/syntax')
    except Exception as exc:
        errors.append(f'{path.name}: {type(exc).__name__}: {exc}')
if len(FILES)!=6: errors.append(f'Expected 6 notebooks, found {len(FILES)}')
if errors:
    print('\n'.join('FAIL '+e for e in errors)); sys.exit(1)
print(f'Notebook static validation: {len(FILES)}/{len(FILES)} PASS; {checked_cells} code cells syntax-checked')

def verify_python_envelopes(job_path, result_path):
    job=json.loads(job_path.read_text(encoding='utf-8')); result=json.loads(result_path.read_text(encoding='utf-8'))
    job_payload=job['canonicalPayload']; result_payload=result['canonicalPayload']
    if 'sha256:'+hashlib.sha256(job_payload.encode()).hexdigest()!=job['digest']: raise RuntimeError('Job SHA-256 mismatch')
    if 'sha256:'+hashlib.sha256(result_payload.encode()).hexdigest()!=result['resultDigest']: raise RuntimeError('Result SHA-256 mismatch')
    job_body={k:v for k,v in job.items() if k not in ('jobId','digest','canonicalPayload')}
    result_body={k:v for k,v in result.items() if k not in ('canonicalPayload','resultDigest')}
    if json.loads(job_payload)!=job_body: raise RuntimeError('Job payload/body mismatch')
    if json.loads(result_payload)!=result_body: raise RuntimeError('Result payload/body mismatch')
    if result['jobId']!=job['jobId'] or result['jobDigest']!=job['digest']: raise RuntimeError('Result is not bound to job')
    if result['evidenceState']!='UNVERIFIED' or result['physicalVerification'] is not False: raise RuntimeError('Evidence promotion boundary violated')
    return len(result['outputs'])

# Execute CPU-reference notebooks where the libraries exist. This is not a hosted Colab/GPU test.
if '--static-only' in sys.argv:
    print('Static-only mode requested; notebook runtime execution not repeated.')
    sys.exit(0)
for notebook, deps, result_name in [
    ('01_scipy_solver_validation.ipynb',('numpy','scipy','nbclient','ipykernel'),'pap-emulation-result.json'),
    ('06_jax_gpu_ensemble_colab.ipynb',('jax','nbclient','ipykernel'),'pap-jax-result.json')]:
    try:
        for dep in deps: __import__(dep)
    except ImportError as exc:
        print(f'SKIP local execution {notebook}; optional dependency missing: {exc}')
        continue
    try:
        from nbclient import NotebookClient
        nb=nbformat.read(ROOT/notebook,as_version=4)
        with tempfile.TemporaryDirectory(prefix='pap-colab-local-') as tmp:
            NotebookClient(nb,timeout=300,kernel_name='python3',resources={'metadata':{'path':tmp}}).execute()
            job_path=Path(tmp)/'pap-emulation-job.json'; result_path=Path(tmp)/result_name
            if not job_path.exists() or not result_path.exists(): raise RuntimeError('Notebook did not export job and result envelopes')
            samples=verify_python_envelopes(job_path,result_path)
        print(f'PASS local CPU execution {notebook}: {samples} result sample(s), SHA-256 and job binding verified')
    except Exception as exc:
        print(f'FAIL local execution {notebook}: {type(exc).__name__}: {exc}')
        sys.exit(1)
