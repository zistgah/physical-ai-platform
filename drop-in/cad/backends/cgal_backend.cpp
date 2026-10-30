// Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
// CGAL exact-construction mesh intersection bridge. JSON stdin/stdout protocol.
// Build: see backends/README.md. Requires CGAL, GMP, MPFR, and nlohmann-json.
#include <CGAL/Exact_predicates_exact_constructions_kernel.h>
#include <CGAL/Surface_mesh.h>
#include <CGAL/Polygon_mesh_processing/corefinement.h>
#include <CGAL/Polygon_mesh_processing/orientation.h>
#include <CGAL/Polygon_mesh_processing/measure.h>
#include <CGAL/Polygon_mesh_processing/self_intersections.h>
#include <CGAL/boost/graph/helpers.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <cmath>
#include <map>
#include <vector>
#include <string>
namespace PMP=CGAL::Polygon_mesh_processing;
using K=CGAL::Exact_predicates_exact_constructions_kernel;
using Mesh=CGAL::Surface_mesh<K::Point_3>;
using json=nlohmann::json;
static json hold(std::string why,std::string code="INVALID_INPUT"){return {{"outcome","HOLD"},{"engine","CGAL-EPECK"},{"reason",why},{"code",code}};}
static bool read_mesh(const json& j,Mesh& m,std::string& err){
 try {
  if(!j.contains("vertices")||!j.contains("faces")){err="mesh requires vertices and faces";return false;}
  std::vector<Mesh::Vertex_index> v;
  for(const auto& p:j.at("vertices")){ if(!p.is_object()) {err="invalid vertex";return false;} double x=p.at("x").get<double>(),y=p.at("y").get<double>(),z=p.at("z").get<double>(); if(!std::isfinite(x)||!std::isfinite(y)||!std::isfinite(z)){err="non-finite coordinate";return false;} v.push_back(m.add_vertex(K::Point_3(x,y,z))); }
  for(const auto& f:j.at("faces")){if(!f.is_array()||f.size()!=3){err="CGAL backend requires triangle faces";return false;} auto a=f[0].get<int>(),b=f[1].get<int>(),c=f[2].get<int>(); if(a<0||b<0||c<0||a>=int(v.size())||b>=int(v.size())||c>=int(v.size())){err="face index out of range";return false;} if(m.add_face(v[a],v[b],v[c])==Mesh::null_face()){err="input is non-manifold or inconsistently oriented";return false;} }
  if(!CGAL::is_closed(m)){err="input mesh is not closed";return false;}
  if(PMP::does_self_intersect(m)){err="input mesh self-intersects";return false;}
  if(!PMP::does_bound_a_volume(m)){err="input mesh does not bound a volume";return false;}
  if(!PMP::is_outward_oriented(m)) PMP::reverse_face_orientations(m);
  return true;
 } catch(const std::exception& e){err=e.what();return false;}
}
int main(){
 try {
  json in; std::cin>>in;
  if(in.value("action",std::string())=="probe"){std::cout<<json({{"available",true},{"engine","CGAL-EPECK"},{"kernel","Exact_predicates_exact_constructions_kernel"}}).dump();return 0;}
  Mesh a,b,out; std::string err;
  if(!read_mesh(in.at("base"),a,err)){std::cout<<hold("base: "+err).dump();return 0;}
  if(!read_mesh(in.at("cutter"),b,err)){std::cout<<hold("cutter: "+err).dump();return 0;}
  bool ok=PMP::corefine_and_compute_intersection(a,b,out);
  if(!ok||out.number_of_faces()==0||!CGAL::is_closed(out)||!PMP::does_bound_a_volume(out)){std::cout<<hold("CGAL corefinement did not produce a closed volumetric result","BOOLEAN_FAILED").dump();return 0;}
  if(!PMP::is_outward_oriented(out))PMP::reverse_face_orientations(out);
  json vertices=json::array(),faces=json::array(); std::map<Mesh::Vertex_index,int> ids;
  for(auto v:out.vertices()){auto p=out.point(v);ids[v]=int(vertices.size());vertices.push_back({{"x",CGAL::to_double(p.x())},{"y",CGAL::to_double(p.y())},{"z",CGAL::to_double(p.z())}});}
  for(auto f:out.faces()){json tri=json::array();for(auto v:CGAL::vertices_around_face(out.halfedge(f),out))tri.push_back(ids.at(v));if(tri.size()==3)faces.push_back(tri);}
  double vol=std::abs(CGAL::to_double(PMP::volume(out)));
  if(!std::isfinite(vol)||vol<=0){std::cout<<hold("CGAL result has invalid volume","INVALID_VOLUME").dump();return 0;}
  json mesh={{"vertices",vertices},{"faces",faces}};
  std::cout<<json({{"outcome","OK"},{"operation","INTERSECTION"},{"engine","CGAL-EPECK"},{"solid",{{"vertices",vertices},{"faces",faces},{"kind","BREP_MESH"}}},{"mesh",mesh},{"volume",vol},{"triangleCount",faces.size()},{"solidCount",1},{"topology",{{"watertight",true},{"exactPredicates",true},{"exactConstructions",true}}}}).dump();
 } catch(const std::exception& e){std::cout<<hold(std::string("CGAL exception: ")+e.what(),"BACKEND_ERROR").dump();}
}
