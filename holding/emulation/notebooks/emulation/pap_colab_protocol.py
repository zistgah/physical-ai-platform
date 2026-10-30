# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
# SPDX-License-Identifier: GPL-3.0-only
# Embedded in each notebook so notebooks remain independently runnable.
PAP_BRIDGE_VERSION = '1.0.0'
PAP_JOB_SCHEMA = 'pap.emulation.job/1.0'
PAP_RESULT_SCHEMA = 'pap.emulation.result/1.0'

def pap_canonical(value):
    import json
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)

def pap_digest(text):
    import hashlib
    return 'sha256:' + hashlib.sha256(text.encode('utf-8')).hexdigest()

def pap_make_job(backend_id, operation, inputs):
    from datetime import datetime, timezone
    body = {
        'schema': PAP_JOB_SCHEMA,
        'bridgeVersion': PAP_BRIDGE_VERSION,
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'target': {'backendId': backend_id, 'backendVersion': None, 'operation': operation, 'requestedDevice': 'auto'},
        'sir': {'header': {'id': 'colab-reference-fixture', 'irVersion': '1.0.0'}, 'components': []},
        'inputs': inputs,
        'observations': None,
        'configuration': {},
        'provenance': {'source': 'COLAB_REFERENCE_FIXTURE', 'sourceVersion': '1.0.0', 'license': 'GPL-3.0-only'}
    }
    canonical = pap_canonical(body)
    digest = pap_digest(canonical)
    return {**body, 'jobId': 'papjob-' + digest[7:27], 'digest': digest, 'canonicalPayload': canonical}

def pap_verify_job(job, expected_backend):
    import json
    if not isinstance(job, dict) or job.get('schema') != PAP_JOB_SCHEMA:
        raise ValueError('Unsupported/missing PAP job schema')
    payload = job.get('canonicalPayload')
    if not isinstance(payload, str): raise ValueError('Job canonicalPayload missing')
    parsed = json.loads(payload)
    body = {k:v for k,v in job.items() if k not in ('jobId','digest','canonicalPayload')}
    if pap_canonical(parsed) != pap_canonical(body): raise ValueError('Job payload/body mismatch')
    digest = pap_digest(payload)
    if digest != job.get('digest') or job.get('jobId') != 'papjob-' + digest[7:27]:
        raise ValueError('Job digest/jobId verification failed')
    if job.get('target',{}).get('backendId') != expected_backend:
        raise ValueError('Job targets a different backend')
    if not isinstance(job.get('inputs'), dict): raise ValueError('Job inputs must be an object')
    return job

def pap_get_job(backend_id, operation, default_inputs, use_demo=True):
    if use_demo:
        return pap_make_job(backend_id, operation, default_inputs), True
    from google.colab import files
    import json
    uploaded = files.upload()
    candidates = [name for name in uploaded if name.lower().endswith('.json')]
    if len(candidates) != 1: raise ValueError('Upload exactly one browser-exported PAP job .json')
    return pap_verify_job(json.loads(uploaded[candidates[0]].decode('utf-8')), backend_id), False

def pap_make_result(job, backend_id, backend_version, outputs, diagnostics, device='cpu'):
    from datetime import datetime, timezone
    body = {
        'schema': PAP_RESULT_SCHEMA,
        'bridgeVersion': PAP_BRIDGE_VERSION,
        'jobId': job['jobId'],
        'jobDigest': job['digest'],
        'backend': {'id': backend_id, 'version': str(backend_version)},
        'execution': {'status': 'EXECUTED', 'runtime': 'COLAB', 'startedAt': None,
                      'finishedAt': datetime.now(timezone.utc).isoformat(), 'device': str(device)},
        'outputs': outputs,
        'diagnostics': diagnostics,
        'fidelity': 'SIMULATED',
        'physicalVerification': False,
        'evidenceState': 'UNVERIFIED',
        'claims': {'verified': False, 'hil': False, 'physical': False}
    }
    canonical = pap_canonical(body)
    return {**body, 'canonicalPayload': canonical, 'resultDigest': pap_digest(canonical)}

def pap_export(job, result, is_demo, result_filename='pap-emulation-result.json'):
    import json
    with open(result_filename, 'w', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2, ensure_ascii=False, allow_nan=False)
    if is_demo:
        with open('pap-emulation-job.json', 'w', encoding='utf-8') as stream:
            json.dump(job, stream, indent=2, ensure_ascii=False, allow_nan=False)
    try:
        from google.colab import files
        files.download(result_filename)
        if is_demo: files.download('pap-emulation-job.json')
    except ImportError:
        print('Saved locally:', result_filename, '(download manually outside Colab)')
    print('Result remains SIMULATED / UNVERIFIED. Import it through the PAP Colab Bridge.')
