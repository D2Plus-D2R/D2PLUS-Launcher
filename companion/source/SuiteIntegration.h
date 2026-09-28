#pragma once
// D2PLUS additions: target identity, per-user config, startup evidence, parent lifetime.
// MIT, Copyright (c) 2026 D2PLUS contributors. No game offsets are changed.
#include <windows.h>
#include <string>
#include <cstdlib>
inline std::wstring SuiteEnv(const wchar_t* name) {
    wchar_t b[32768]{}; DWORD n=GetEnvironmentVariableW(name,b,32768);
    return n && n<32768 ? std::wstring(b,n) : L"";
}
inline DWORD& SuiteTargetPid() { static DWORD pid=0; return pid; }
inline HANDLE& SuiteParentHandle() { static HANDLE h=nullptr; return h; }
inline void SuiteStatus(const char* state) {
    const auto path=SuiteEnv(L"D2PLUS_STATUS_FILE"), nonce=SuiteEnv(L"D2PLUS_STATUS_NONCE");
    if(path.empty() || nonce.empty()) return;
    std::string text(nonce.begin(),nonce.end());
    text += "\n"+std::to_string(SuiteTargetPid())+"\n"+state+"\n";
    HANDLE f=CreateFileW(path.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(f!=INVALID_HANDLE_VALUE) { DWORD n; WriteFile(f,text.data(),(DWORD)text.size(),&n,nullptr); CloseHandle(f); }
}
inline bool SuiteValidateIdentity(DWORD pid) {
    auto expected=SuiteEnv(L"D2PLUS_TARGET_EXE"), start=SuiteEnv(L"D2PLUS_TARGET_START");
    HANDLE h=OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|SYNCHRONIZE,FALSE,pid);
    if(!h) return false;
    wchar_t path[32768]{}; DWORD size=32768; FILETIME c{},e{},k{},u{};
    bool ok=QueryFullProcessImageNameW(h,0,path,&size) && GetProcessTimes(h,&c,&e,&k,&u) && WaitForSingleObject(h,0)==WAIT_TIMEOUT;
    ULARGE_INTEGER value{}; value.LowPart=c.dwLowDateTime; value.HighPart=c.dwHighDateTime;
    if(!expected.empty()) ok=ok && _wcsicmp(expected.c_str(),path)==0;
    if(!start.empty()) ok=ok && _wcstoui64(start.c_str(),nullptr,10)==value.QuadPart;
    CloseHandle(h); return ok;
}
inline bool SuiteInitialize() {
    auto pid=SuiteEnv(L"D2PLUS_TARGET_PID");
    if(pid.empty()) return true;
    SuiteTargetPid()=wcstoul(pid.c_str(),nullptr,10);
    if(!SuiteTargetPid() || SuiteEnv(L"D2PLUS_TARGET_EXE").empty() || SuiteEnv(L"D2PLUS_TARGET_START").empty()) return false;
    auto parent=SuiteEnv(L"D2PLUS_PARENT_PID");
    SuiteParentHandle()=OpenProcess(SYNCHRONIZE,FALSE,wcstoul(parent.c_str(),nullptr,10));
    if (!SuiteParentHandle() || !SuiteValidateIdentity(SuiteTargetPid())) return false;
    // Also stop if the backend exits while an upstream startup dialog is open.
    HANDLE watcher=CreateThread(nullptr,0,[](LPVOID)->DWORD {
        WaitForSingleObject(SuiteParentHandle(),INFINITE); ExitProcess(0); return 0;
    },nullptr,0,nullptr);
    if (!watcher) return false;
    CloseHandle(watcher); return true;
}
inline bool SuiteParentExited() {
    return SuiteParentHandle() && WaitForSingleObject(SuiteParentHandle(),0)!=WAIT_TIMEOUT;
}
