#pragma once
#define NOMINMAX
#include <windows.h>
#include <type_traits>
// Equivalent value comparisons for upstream unqualified Windows min/max calls.
template<class A,class B> inline std::common_type_t<A,B> min(A a,B b) {return a<b?a:b;}
template<class A,class B> inline std::common_type_t<A,B> max(A a,B b) {return a>b?a:b;}
