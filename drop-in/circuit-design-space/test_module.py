# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# SPDX-License-Identifier: GPL-3.0-only
import math
import json
from pathlib import Path
import unittest
from module import (rc_step_response, explore_rc_design_space, fit_rc_time_constant,
                    resistance_from_tau, local_sensitivity_tau, rlc_step_response, explore_rlc_design_space)

class DesignSpaceTests(unittest.TestCase):
    def setUp(self):
        self.t = [i*0.001 for i in range(1, 101)]

    def test_01_analytical_rc_reference(self):
        r = rc_step_response(self.t, 1000, 1e-6)
        self.assertEqual(r['outcome'], 'OK')
        self.assertAlmostEqual(r['voltage_v'][0], 1-math.exp(-1), places=12)
        self.assertAlmostEqual(r['tau_s'], 0.001)

    def test_02_initial_voltage(self):
        r = rc_step_response(self.t, 1000, 1e-6, step_v=5, initial_v=2)
        self.assertAlmostEqual(r['voltage_v'][0], 2+3*(1-math.exp(-1)), places=11)

    def test_03_grid_cartesian_count(self):
        r = explore_rc_design_space([100, 1000], [1e-6, 2e-6], self.t)
        self.assertEqual(r['candidate_count'], 4)
        self.assertEqual(len(r['candidates']), 4)

    def test_04_grid_metrics(self):
        r = explore_rc_design_space([1000], [1e-6], self.t)
        c = r['candidates'][0]
        self.assertAlmostEqual(c['tau_s'], .001)
        self.assertAlmostEqual(c['rise_10_90_s'], .0021972245773362196)
        self.assertAlmostEqual(c['initial_current_a'], .001)
        self.assertAlmostEqual(c['stored_energy_j'], .5e-6)

    def test_05_constraint_feasible(self):
        r = explore_rc_design_space([1000], [1e-6], self.t, constraints={'max_tau_s': .002})
        self.assertTrue(r['candidates'][0]['feasible'])

    def test_06_constraint_hold(self):
        r = explore_rc_design_space([100], [1e-6], self.t, constraints={'max_initial_current_a': .005})
        self.assertFalse(r['candidates'][0]['feasible'])
        self.assertIn('max_initial_current_a exceeded', r['candidates'][0]['hold_reasons'])

    def test_07_empty_resistance_hold(self): self.assertEqual(explore_rc_design_space([], [1e-6], self.t)['outcome'], 'HOLD')
    def test_08_zero_resistance_hold(self): self.assertEqual(explore_rc_design_space([0], [1e-6], self.t)['outcome'], 'HOLD')
    def test_09_nan_capacitance_hold(self): self.assertEqual(explore_rc_design_space([1e3], [float('nan')], self.t)['outcome'], 'HOLD')
    def test_10_nonmonotonic_time_hold(self): self.assertEqual(rc_step_response([0, .1, .05], 1e3, 1e-6)['outcome'], 'HOLD')
    def test_11_duplicate_time_hold(self): self.assertEqual(rc_step_response([0, .1, .1], 1e3, 1e-6)['outcome'], 'HOLD')
    def test_12_negative_time_hold(self): self.assertEqual(rc_step_response([-1, .1], 1e3, 1e-6)['outcome'], 'HOLD')
    def test_13_invalid_backend_hold(self): self.assertEqual(explore_rc_design_space([1e3], [1e-6], self.t, backend='cuda')['outcome'], 'HOLD')
    def test_14_candidate_limit_hold(self): self.assertEqual(explore_rc_design_space([1,2], [1,2], self.t, max_candidates=3)['outcome'], 'HOLD')
    def test_15_output_limit_hold(self): self.assertEqual(explore_rc_design_space([1], [1], self.t, max_output_values=10)['outcome'], 'HOLD')
    def test_16_constraint_unknown_hold(self): self.assertEqual(explore_rc_design_space([1], [1], self.t, constraints={'magic': 2})['outcome'], 'HOLD')
    def test_17_constraint_nan_hold(self): self.assertEqual(explore_rc_design_space([1], [1], self.t, constraints={'max_tau_s': float('nan')})['outcome'], 'HOLD')
    def test_18_deterministic_grid(self):
        a=explore_rc_design_space([100,1000],[1e-6],self.t); b=explore_rc_design_space([100,1000],[1e-6],self.t)
        self.assertEqual(a,b)

    def test_19_fit_exact_tau(self):
        import numpy as np
        tau=.002
        y=(1-np.exp(-np.asarray(self.t)/tau)).tolist()
        fit=fit_rc_time_constant(self.t,y,tau_bounds_s=(1e-5,.1))
        self.assertEqual(fit['outcome'],'OK')
        self.assertAlmostEqual(fit['tau_s'],tau,places=8)
        self.assertEqual(fit['identifiable_parameters'],['tau_s'])

    def test_20_fit_noisy_tau(self):
        import numpy as np
        tau=.003
        y=(1-np.exp(-np.asarray(self.t)/tau) + .0001*np.sin(np.arange(len(self.t)))).tolist()
        fit=fit_rc_time_constant(self.t,y,tau_bounds_s=(1e-5,.1))
        self.assertEqual(fit['outcome'],'OK')
        self.assertLess(abs(fit['tau_s']-tau)/tau,.01)

    def test_21_fit_weights(self):
        import numpy as np
        y=(1-np.exp(-np.asarray(self.t)/.002)).tolist()
        fit=fit_rc_time_constant(self.t,y,weights=[1.0]*len(y))
        self.assertEqual(fit['outcome'],'OK')

    def test_22_fit_length_mismatch(self): self.assertEqual(fit_rc_time_constant(self.t,[1,2])['outcome'],'HOLD')
    def test_23_fit_nan_measurement(self): self.assertEqual(fit_rc_time_constant(self.t,[float('nan')]*len(self.t))['outcome'],'HOLD')
    def test_24_fit_insufficient_observations(self): self.assertEqual(fit_rc_time_constant([.1],[.5])['outcome'],'HOLD')
    def test_25_fit_bad_bounds(self): self.assertEqual(fit_rc_time_constant(self.t,[.5]*len(self.t),tau_bounds_s=(1,1))['outcome'],'HOLD')
    def test_26_fit_bad_weights(self): self.assertEqual(fit_rc_time_constant(self.t,[.5]*len(self.t),weights=[0]*len(self.t))['outcome'],'HOLD')

    def test_27_recover_r_with_known_c(self):
        r=resistance_from_tau(.002,2e-6)
        self.assertEqual(r['outcome'],'OK'); self.assertAlmostEqual(r['resistance_ohm'],1000)
    def test_28_no_r_without_known_c_claim(self):
        import numpy as np
        y=(1-np.exp(-np.asarray(self.t)/.002)).tolist()
        fit=fit_rc_time_constant(self.t,y)
        self.assertIsNone(fit['resistance_ohm_if_capacitance_known'])
    def test_29_sensitivity_zero_at_t0(self):
        s=local_sensitivity_tau([0,.001,.002],.001)
        self.assertEqual(s['outcome'],'OK'); self.assertEqual(s['dV_dtau_v_per_s'][0],0)
    def test_30_sensitivity_bad_tau(self): self.assertEqual(local_sensitivity_tau(self.t,0)['outcome'],'HOLD')

    def test_31_explicit_jax_or_hold(self):
        r=explore_rc_design_space([1000],[1e-6],self.t,backend='jax')
        self.assertIn(r['outcome'],('OK','HOLD'))
        if r['outcome']=='OK': self.assertTrue(r['engine'].startswith('jax:'))
    def test_32_gpu_flag_requires_jax_backend(self):
        self.assertEqual(explore_rc_design_space([1000],[1e-6],self.t,backend='numpy',require_gpu=True)['outcome'],'HOLD')

    def test_33_gpu_never_falsely_claimed(self):
        r=explore_rc_design_space([1000],[1e-6],self.t,backend='jax',require_gpu=True)
        if r['outcome']=='OK': self.assertEqual(r['engine'],'jax:gpu')
        else: self.assertEqual(r['outcome'],'HOLD')

    def test_34_fit_bound_solution_holds(self):
        import numpy as np
        y=(1-np.exp(-np.asarray(self.t)/1.0)).tolist()
        r=fit_rc_time_constant(self.t,y,tau_bounds_s=(1e-6,1e-5))
        self.assertEqual(r['outcome'],'HOLD')

    def test_35_shipped_design_grid_sample(self):
        sample=json.loads((Path(__file__).parent/'samples'/'rc-design-space.json').read_text())
        result=explore_rc_design_space(**sample['input'])
        self.assertEqual(result['outcome'],'OK')
        self.assertEqual(result['candidate_count'],sample['expected']['candidate_count'])
        self.assertAlmostEqual(result['candidates'][0]['tau_s'],sample['expected']['first_candidate_tau_s'])
        self.assertAlmostEqual(result['candidates'][0]['initial_current_a'],sample['expected']['first_candidate_initial_current_a'])

    def test_36_shipped_measurement_sample(self):
        sample=json.loads((Path(__file__).parent/'samples'/'rc-measurements.json').read_text())
        result=fit_rc_time_constant(sample['times_s'],sample['measured_voltage_v'],
                                    initial_v=sample['known_initial_v'],final_v=sample['known_final_v'])
        self.assertEqual(result['outcome'],'OK')
        self.assertAlmostEqual(result['tau_s'],sample['expected_tau_s'],places=8)

    def test_37_rlc_underdamped(self):
        r=rlc_step_response(self.t,20.0,1e-3,1e-6)
        self.assertEqual(r['outcome'],'OK'); self.assertEqual(r['damping_regime'],'underdamped')
        self.assertAlmostEqual(r['voltage_v'][-1],1.0,delta=.02)

    def test_38_rlc_critically_damped(self):
        r=rlc_step_response(self.t,2*math.sqrt(1e-3/1e-6),1e-3,1e-6)
        self.assertEqual(r['damping_regime'],'critically_damped')

    def test_39_rlc_overdamped(self):
        r=rlc_step_response(self.t,200.0,1e-3,1e-6)
        self.assertEqual(r['damping_regime'],'overdamped')

    def test_40_rlc_initial_voltage_offset(self):
        r=rlc_step_response(self.t,200.0,1e-3,1e-6,step_v=5,initial_v=2)
        self.assertGreaterEqual(r['voltage_v'][0],2.0)
        self.assertAlmostEqual(r['voltage_v'][-1],5.0,delta=.02)

    def test_41_rlc_grid_regime_classification(self):
        r=explore_rlc_design_space([20,2*math.sqrt(1e-3/1e-6),200],[1e-3],[1e-6],self.t)
        self.assertEqual(r['outcome'],'OK')
        self.assertEqual([x['damping_regime'] for x in r['candidates']],['underdamped','critically_damped','overdamped'])

    def test_42_rlc_constraint_holds_candidate(self):
        tfast=[i*1e-6 for i in range(1,500)]
        r=explore_rlc_design_space([20],[1e-3],[1e-6],tfast,constraints={'max_overshoot_fraction':0.01})
        self.assertFalse(r['candidates'][0]['feasible'])

    def test_43_rlc_invalid_component(self): self.assertEqual(rlc_step_response(self.t,0,1e-3,1e-6)['outcome'],'HOLD')
    def test_44_rlc_grid_candidate_limit(self): self.assertEqual(explore_rlc_design_space([1,2],[1,2],[1,2],self.t,max_candidates=7)['outcome'],'HOLD')
    def test_45_rlc_deterministic(self):
        a=explore_rlc_design_space([20,200],[1e-3],[1e-6],self.t)
        b=explore_rlc_design_space([20,200],[1e-3],[1e-6],self.t)
        self.assertEqual(a,b)
    def test_46_shipped_rlc_regime_sample(self):
        sample=json.loads((Path(__file__).parent/'samples'/'rlc-damping-regimes.json').read_text())
        r=explore_rlc_design_space(sample['resistance_ohm'],[sample['inductance_h']],[sample['capacitance_f']],sample['times_s'])
        self.assertEqual(r['outcome'],'OK')
        self.assertEqual([x['damping_regime'] for x in r['candidates']],sample['expected_regimes'])

    def test_47_rlc_analytical_against_independent_ode(self):
        import numpy as np
        from scipy.integrate import solve_ivp
        times=np.linspace(1e-6,0.004,100)
        for resistance in (20.0,2*math.sqrt(1e-3/1e-6),200.0):
            analytical=rlc_step_response(times.tolist(),resistance,1e-3,1e-6,step_v=5.0)
            def rhs(_t,state):
                current, capacitor_voltage=state
                return [(5.0-resistance*current-capacitor_voltage)/1e-3,current/1e-6]
            numerical=solve_ivp(rhs,(0.0,float(times[-1])),[0.0,0.0],t_eval=times,rtol=1e-10,atol=1e-12)
            self.assertTrue(numerical.success)
            self.assertLess(float(np.max(np.abs(np.asarray(analytical['voltage_v'])-numerical.y[1]))),1e-8)

    def test_48_jax_rlc_grid_or_hold(self):
        r=explore_rlc_design_space([20,200],[1e-3],[1e-6],self.t,backend='jax')
        self.assertIn(r['outcome'],('OK','HOLD'))
        if r['outcome']=='OK': self.assertTrue(r['engine'].startswith('jax:'))

    def test_49_rlc_damping_classification_boundary(self):
        critical_r=2*math.sqrt(1e-3/1e-6)
        regimes=[]
        for zeta in (1-2e-6,1-1e-6,1.0,1+1e-6,1+2e-6):
            result=rlc_step_response(self.t,critical_r*zeta,1e-3,1e-6)
            regimes.append(result['damping_regime'])
        self.assertEqual(regimes,['underdamped','critically_damped','critically_damped','critically_damped','overdamped'])

    def test_50_candidate_limit_exact_boundary(self):
        r=explore_rc_design_space([1000],[1e-6],self.t,max_candidates=1)
        self.assertEqual(r['outcome'],'OK'); self.assertEqual(r['candidate_count'],1)

    def test_51_output_limit_exact_boundary(self):
        r=explore_rlc_design_space([20],[1e-3],[1e-6],self.t,max_candidates=1,max_output_values=len(self.t))
        self.assertEqual(r['outcome'],'OK'); self.assertEqual(r['candidate_count'],1)

    def test_52_zero_current_constraint_is_valid(self):
        r=explore_rc_design_space([1000],[1e-6],self.t,step_v=0,constraints={'max_initial_current_a':0})
        self.assertEqual(r['outcome'],'OK'); self.assertTrue(r['candidates'][0]['feasible'])

    def test_53_zero_overshoot_constraint_is_valid(self):
        r=explore_rlc_design_space([200],[1e-3],[1e-6],self.t,constraints={'max_overshoot_fraction':0})
        self.assertEqual(r['outcome'],'OK'); self.assertTrue(r['candidates'][0]['feasible'])

if __name__ == '__main__': unittest.main(verbosity=2)
