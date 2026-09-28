#!/usr/bin/env sh
set -eu
: "${LLVM_MINGW:?Set LLVM_MINGW to your extracted llvm-mingw directory}"
cd "$(dirname "$0")"
"$LLVM_MINGW/bin/x86_64-w64-mingw32-windres" -I. SuiteResources.rc -o SuiteResources.o
"$LLVM_MINGW/bin/x86_64-w64-mingw32-clang++" -std=c++17 -O2 -municode -mwindows -DUNICODE -D_UNICODE ./*.cpp SuiteResources.o -o ../D2PLUSDamageNumbers.exe -lbcrypt -ldwmapi -lpsapi -lwinmm -lcomctl32 -lgdi32 -lshell32 -static
node ../../scripts/stamp-companion.cjs "llvm-mingw 20260922, x86_64 UCRT, static C++ runtime; cross-compiled on Linux"
