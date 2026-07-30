cmake_minimum_required(VERSION 4.0)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)

project(bare_path C)

add_bare_module(bare_path)

target_sources(
  ${bare_path}
  PRIVATE
    binding.c
)
