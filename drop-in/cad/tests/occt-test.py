# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
"""OCCT native integration and adversarial tests; requires OCP only, not CadQuery."""
import sys, pathlib, json, math
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backends'))
from occt_backend import run

def check(v,m):
    if not v: raise AssertionError(m)
def sample(name): return json.loads((ROOT/'samples'/f'{name}.json').read_text())
def execute(s): return run({'base':s['base'],'cutter':s['cutter'],'tolerance':1e-7,'deflection':1e-3})

for name,expected in [('box-overlap',125),('nonconvex-l-prism',4.5),('rotated-box',None),('identical-solids',1000),('contained-solid',1)]:
    s=sample(name); r=execute(s)
    check(r['outcome']=='OK',f'{name} executes: {r}')
    check(r['topology']['watertight'] and r['topology']['meshVolumeVerified'],f'{name} topology and independent volume verification')
    if expected is not None: check(abs(r['volume']-expected)<1e-5,f'{name} analytic volume {expected}, got {r["volume"]}')
    check(math.isfinite(r['volume']) and r['volume']>0,f'{name} positive finite volume')

for name in ['disjoint-solids','tangent-solids']:
    r=execute(sample(name)); check(r['outcome']=='HOLD',f'{name} must HOLD: {r}')

invalid=sample('box-overlap'); invalid['base']['faces'].pop()
r=run({'base':invalid['base'],'cutter':invalid['cutter'],'tolerance':1e-7,'deflection':1e-3})
check(r['outcome']=='HOLD','open shell must HOLD')

s=sample('box-overlap'); r1=execute(s); r2=execute(s)
check(r1['outcome']==r2['outcome'] and abs(r1['volume']-r2['volume'])<1e-12 and r1['triangleCount']==r2['triangleCount'],'repeatability')
print('OCCT CAD backend PASS: 9 cases including non-convex, rotated, containment, coincidence, tangent, disjoint, invalid shell, topology, volume oracle and repeatability')
