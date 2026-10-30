# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved.
cmake_minimum_required(VERSION 3.20)
project(cad_cgal_backend LANGUAGES CXX)
find_package(CGAL REQUIRED)
find_package(nlohmann_json REQUIRED)
add_executable(cad-cgal-boolean cgal_backend.cpp)
target_compile_features(cad-cgal-boolean PRIVATE cxx_std_17)
target_link_libraries(cad-cgal-boolean PRIVATE CGAL::CGAL nlohmann_json::nlohmann_json)
