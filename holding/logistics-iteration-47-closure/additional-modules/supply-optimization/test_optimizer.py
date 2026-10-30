# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
# AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
import json, pathlib, unittest
from optimizer import optimize_sourcing, safety_stock, simulate_uncertainty, analyze_network_resilience, simulate_event_timeline, available_backends

ROOT = pathlib.Path(__file__).resolve().parent

class OptimizerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample=json.loads((ROOT/"samples"/"sourcing-problem.json").read_text())

    def test_backend_catalog_exposes_cpu_solver(self):
        backends=available_backends()
        self.assertIn("SCIPY_HIGHS",backends)
        self.assertTrue(backends["SCIPY_HIGHS"]["available"])

    def test_unknown_backend_holds(self):
        p=json.loads(json.dumps(self.sample)); p["backend"]="MAGIC_SOLVER"
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_optional_ortools_backend_is_explicit(self):
        p=json.loads(json.dumps(self.sample)); p["backend"]="ORTOOLS_GLOP"
        r=optimize_sourcing(p)
        if available_backends()["ORTOOLS_GLOP"]["available"]:
            self.assertEqual(r["outcome"],"OK")
        else:
            self.assertEqual(r["outcome"],"HOLD")
            self.assertIn("not installed",r["reason"])

    def test_optional_pyomo_backend_is_explicit(self):
        p=json.loads(json.dumps(self.sample)); p["backend"]="PYOMO_HIGHS"
        r=optimize_sourcing(p)
        if available_backends()["PYOMO_HIGHS"]["available"]:
            self.assertEqual(r["outcome"],"OK")
        else:
            self.assertEqual(r["outcome"],"HOLD")
            self.assertIn("not installed",r["reason"])

    def test_sample_is_feasible_and_fully_allocated(self):
        r=optimize_sourcing(self.sample)
        self.assertEqual(r["outcome"],"OK")
        self.assertAlmostEqual(r["total_quantity"],20,places=6)
        self.assertEqual(r["commitment"],"OPTIMIZED_PLAN_NOT_PURCHASED")
        self.assertIn("S3-SERVO",[x["offer_id"] for x in r["excluded_offers"]])

    def test_unapproved_supplier_never_selected(self):
        r=optimize_sourcing(self.sample)
        self.assertNotIn("S3-SERVO",[x["offer_id"] for x in r["allocations"]])

    def test_supplier_share_constraint(self):
        p=dict(self.sample); p["max_supplier_share"]=0.5
        r=optimize_sourcing(p)
        self.assertEqual(r["outcome"],"OK")
        for part in {d["part"] for d in p["demand"]}:
            total=next(d["quantity"] for d in p["demand"] if d["part"]==part)
            by_supplier={}
            for a in r["allocations"]:
                if a["part"]==part: by_supplier[a["supplier_id"]]=by_supplier.get(a["supplier_id"],0)+a["quantity"]
            self.assertTrue(all(v<=total*0.5+1e-7 for v in by_supplier.values()))

    def test_due_date_excludes_late_offer(self):
        p={"demand":[{"part":"P","quantity":2,"due_days":1,"currency":"INR"}],
           "offers":[{"id":"LATE","supplier_id":"S","part":"P","capacity":2,"unit_cost":1,"lead_days":2,
            "carbon_kg":0,"currency":"INR","approved":True,"export_status":"CLEAR","lifecycle_status":"ACTIVE"}]}
        r=optimize_sourcing(p)
        self.assertEqual(r["outcome"],"HOLD")
        self.assertEqual(r["excluded_offers"][0]["reason"],"MISSES_DUE_DATE")

    def test_unknown_export_is_excluded(self):
        p=json.loads(json.dumps(self.sample))
        p["offers"][0]["export_status"]="UNKNOWN"
        r=optimize_sourcing(p)
        self.assertNotIn("S1-SERVO",[a["offer_id"] for a in r.get("allocations",[])])
        self.assertIn("EXPORT_NOT_CLEARED",[x["reason"] for x in r["excluded_offers"]])

    def test_obsolete_supplier_is_excluded(self):
        p=json.loads(json.dumps(self.sample))
        p["offers"][0]["lifecycle_status"]="OBSOLETE"
        r=optimize_sourcing(p)
        self.assertIn("LIFECYCLE_NOT_ELIGIBLE",[x["reason"] for x in r["excluded_offers"]])

    def test_capacity_shortage_holds(self):
        p=json.loads(json.dumps(self.sample))
        for o in p["offers"]: o["capacity"]=0
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_carbon_cap_infeasible_holds(self):
        p=json.loads(json.dumps(self.sample)); p["carbon_cap_kg"]=0.001
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_currency_mismatch_holds(self):
        p=json.loads(json.dumps(self.sample)); p["offers"][0]["currency"]="USD"
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_duplicate_offer_holds(self):
        p=json.loads(json.dumps(self.sample)); p["offers"].append(dict(p["offers"][0]))
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_duplicate_demand_part_holds(self):
        p=json.loads(json.dumps(self.sample)); p["demand"].append(dict(p["demand"][0]))
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_negative_cost_holds(self):
        p=json.loads(json.dumps(self.sample)); p["offers"][0]["unit_cost"]=-1
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_nan_capacity_holds(self):
        p=json.loads(json.dumps(self.sample)); p["offers"][0]["capacity"]=float("nan")
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_zero_weight_vector_holds(self):
        p=json.loads(json.dumps(self.sample)); p["weights"]={"cost":0,"lead_time":0,"carbon":0}
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_max_share_boundary(self):
        p=json.loads(json.dumps(self.sample)); p["max_supplier_share"]=1.0
        self.assertEqual(optimize_sourcing(p)["outcome"],"OK")

    def test_max_share_above_boundary_holds(self):
        p=json.loads(json.dumps(self.sample)); p["max_supplier_share"]=1.00001
        self.assertEqual(optimize_sourcing(p)["outcome"],"HOLD")

    def test_safety_stock_monotonic_with_service_level(self):
        a=safety_stock(10,2,5,1,0.90); b=safety_stock(10,2,5,1,0.99)
        self.assertEqual(a["outcome"],"OK"); self.assertGreater(b["safety_stock"],a["safety_stock"])

    def test_safety_stock_rejects_boundary_zero_service(self):
        self.assertEqual(safety_stock(10,2,5,1,0)["outcome"],"HOLD")

    def test_safety_stock_rejects_service_one(self):
        self.assertEqual(safety_stock(10,2,5,1,1)["outcome"],"HOLD")

    def test_monte_carlo_is_reproducible(self):
        kw=dict(mean_daily_demand=10,demand_std=2,mean_lead_days=5,lead_std_days=1,
                supply_quantity=70,iterations=2000,seed=47)
        a=simulate_uncertainty(**kw); b=simulate_uncertainty(**kw)
        self.assertEqual(a["outcome"],"OK")
        self.assertEqual(a["mean_fill_rate"],b["mean_fill_rate"])
        self.assertEqual(a["stockout_probability"],b["stockout_probability"])

    def test_more_supply_does_not_reduce_fill(self):
        a=simulate_uncertainty(mean_daily_demand=10,demand_std=2,mean_lead_days=5,lead_std_days=1,
             supply_quantity=40,iterations=2000,seed=7)
        b=simulate_uncertainty(mean_daily_demand=10,demand_std=2,mean_lead_days=5,lead_std_days=1,
             supply_quantity=80,iterations=2000,seed=7)
        self.assertGreaterEqual(b["mean_fill_rate"],a["mean_fill_rate"])

    def test_networkx_counts_vertex_disjoint_paths(self):
        r=analyze_network_resilience(
            [{"id":"S"},{"id":"A"},{"id":"B"},{"id":"T"}],
            [{"from":"S","to":"A"},{"from":"A","to":"T"},{"from":"S","to":"B"},{"from":"B","to":"T"}],
            "S","T")
        self.assertEqual(r["outcome"],"OK")
        self.assertEqual(r["vertex_disjoint_path_count"],2)

    def test_networkx_shared_bottleneck_sample(self):
        fixture=json.loads((ROOT/"samples"/"network-resilience.json").read_text())
        r=analyze_network_resilience(fixture["nodes"],fixture["edges"],fixture["source"],fixture["sink"])
        self.assertEqual(r["vertex_disjoint_path_count"],fixture["expected_independent_paths"])

    def test_networkx_dangling_edge_holds(self):
        r=analyze_network_resilience([{"id":"S"},{"id":"T"}],[{"from":"S","to":"MISSING"}],"S","T")
        self.assertEqual(r["outcome"],"HOLD")

    def test_event_timeline_sample_sorts_and_replays(self):
        fixture=json.loads((ROOT/"samples"/"event-timeline.json").read_text())
        r=simulate_event_timeline(fixture["events"])
        self.assertEqual([x["id"] for x in r["timeline"]],fixture["expected_order"])
        self.assertEqual(r["makespan_days"],4)

    def test_event_timeline_duplicate_id_holds(self):
        self.assertEqual(simulate_event_timeline([{"id":"A","time_days":1},{"id":"A","time_days":2}])["outcome"],"HOLD")

    def test_event_timeline_negative_time_holds(self):
        self.assertEqual(simulate_event_timeline([{"id":"A","time_days":-1}])["outcome"],"HOLD")

    def test_iteration_floor(self):
        r=simulate_uncertainty(mean_daily_demand=1,demand_std=0,mean_lead_days=1,lead_std_days=0,
             supply_quantity=2,iterations=99)
        self.assertEqual(r["outcome"],"HOLD")

    def test_invalid_monte_carlo_input(self):
        r=simulate_uncertainty(mean_daily_demand=-1,demand_std=1,mean_lead_days=1,lead_std_days=1,
             supply_quantity=1)
        self.assertEqual(r["outcome"],"HOLD")

if __name__=="__main__":
    unittest.main(verbosity=2)
