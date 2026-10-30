#!/usr/bin/env python3
"""Experimental D2Android 1.5.0 online-controls patch (requires game 1.13d)."""
import sys
from pathlib import Path
root=Path(sys.argv[1])
changes={}
def replace(rel,old,new):
    path=root/rel
    src=changes.get(path)
    if src is None: src=path.read_text(encoding="utf-8")
    if src.count(old)!=1: raise SystemExit("Unexpected D2Android source: "+rel+"; no changes written")
    changes[path]=src.replace(old,new,1)

replace("mod/d2mod.c",
"static void lockMultiplayerMenu(void) {\n    if (menuLockChecked) return;",
"""static void lockMultiplayerMenu(void) {
#ifdef D2ANDROID_SLASH_ONLINE
    if (!menuLockChecked) {
        DWORD launch = (DWORD) GetModuleHandleA("D2Launch.dll");
        if (launch) InterlockedExchange(&menuLockChecked, 1);
    }
    return;
#endif
    if (menuLockChecked) return;""")
replace("mod/d2mod.c",
"        if (player && !singlePlayerGame()) continue;\n        int cmd = buf[5];\n        noteCommand(cmd);",
"""        int cmd = buf[5];
#ifdef D2ANDROID_SLASH_ONLINE
        if (player && !singlePlayerGame()) {
            switch (cmd) {
                case CMD_WALK: case CMD_UNIT: case CMD_TAKE:
                case CMD_SELECT_SKILL: case CMD_DRINK: case CMD_PORTAL:
                case CMD_NPC: case CMD_HIGHLIGHT: case CMD_HUD: break;
                default: continue;
            }
            if (cmd == CMD_HUD && n >= 9) buf[8] &= (BYTE) ~(8 | 32 | 64);
        }
#else
        if (player && !singlePlayerGame()) continue;
#endif
        noteCommand(cmd);""")
replace("tools/build-mod.sh",
'"$CC" "${FLAGS[@]}" -shared -o "$OUT/d2android-mod.dll" mod/d2mod.c -lws2_32',
'FLAGS+=(-DD2ANDROID_SLASH_ONLINE)\n"$CC" "${FLAGS[@]}" -shared -o "$OUT/d2android-mod.dll" mod/d2mod.c -lws2_32')
replace("winlator/app/src/main/java/com/winlator/d2/D2LaunchActivity.java",
"final D2ModInfo.Mod playedMod = D2Mods.active(this);",
"final D2ModInfo.Mod playedMod = null; // online build: disable offline data modifications")
replace("winlator/app/src/main/java/com/winlator/d2/D2LaunchActivity.java",
"""                if (playedMod != null) {
                    if (spielweise.exists() && !spielweise.delete()) throw new IOException("cannot delete " + spielweise);
                    D2Trace.log("mod " + playedMod.id + ": spielweise off");
                }
                else if (!com.winlator.core.FileUtils.writeString(spielweise, D2Settings.spielweiseFile(this)))
                    D2Trace.log("spielweise file not written");


                D2BigInventory.apply(startDir, D2Settings.bigInventory(this));""",
"""                if (spielweise.exists() && !spielweise.delete())
                    throw new IOException("Cannot remove offline playstyle marker");
                D2BigInventory.apply(startDir, false);""")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java",
"boolean plugy = isModBundled(context) && D2Settings.modEnabled(context) && D2Settings.plugy(context);",
"boolean plugy = false; // no PlugY on realm")
replace("winlator/app/src/main/java/com/winlator/d2/D2TouchOverlay.java",
"    private void autoDrink(D2ModState s, long now) {\n\n\n        boolean dead = modLink.heroDeathKnown()",
"    private void autoDrink(D2ModState s, long now) {\n        if (!modLink.singlePlayer()) return;\n        boolean dead = modLink.heroDeathKnown()")
replace("winlator/app/src/main/java/com/winlator/d2/GameLocator.java",
'public static final String DEFAULT_GAME_FOLDER = "D2Android/Diablo II";',
'public static final String DEFAULT_GAME_FOLDER = "SlashDiabloMobile/Diablo II";')
replace("winlator/app/src/main/java/com/winlator/d2/GameLocator.java",
'"primary:Download/D2Android"','"primary:Download/SlashDiabloMobile"')
replace("winlator/app/src/main/java/com/winlator/d2/D2InstallPlan.java",
'public static final String ROOT_FOLDER = "D2Android";',
'public static final String ROOT_FOLDER = "SlashDiabloMobile";')
replace("winlator/app/src/main/java/com/winlator/d2/D2Mods.java",
'public static final String FOLDER = "D2Android/Mods";',
'public static final String FOLDER = "SlashDiabloMobile/Mods";')
replace("winlator/app/src/main/java/com/winlator/d2/D2Saves.java",
'public static final String BACKUP_FOLDER = "D2Android/Sicherungen";',
'public static final String BACKUP_FOLDER = "SlashDiabloMobile/Backups";')
replace("winlator/app/build.gradle",
"applicationId 'at.d2android'","applicationId 'at.slashbh05'")
replace("winlator/app/build.gradle",
"resValue 'string', 'app_name', 'D2Android'",
"resValue 'string', 'app_name', 'SlashDiablo Touch BH Retry 05'")
replace("winlator/app/build.gradle",
"resValue 'string', 'd2launch_label', 'D2Android'",
"resValue 'string', 'd2launch_label', 'SlashDiablo Touch BH Retry 05'")
replace("winlator/gradle.properties",
"d2PublicPackage=at.d2andrpub","d2PublicPackage=at.slashbh05")
replace("winlator/app/src/main/java/com/winlator/core/WineRegistryEditor.java", "    public void setHexValues(String key, String name, byte[] bytes) {", "    public void setMultiStringValue(String key, String name, String... entries) {\n        if (entries == null || entries.length == 0) throw new IllegalArgumentException(\"Empty multi-string value\");\n        StringBuilder combined = new StringBuilder();\n        for (String entry : entries) {\n            if (entry == null || entry.indexOf((char) 0) >= 0)\n                throw new IllegalArgumentException(\"Invalid multi-string entry\");\n            combined.append(entry).append((char) 0);\n        }\n        combined.append((char) 0);\n        byte[] bytes = combined.toString().getBytes(java.nio.charset.StandardCharsets.UTF_16LE);\n        StringBuilder hex = new StringBuilder(bytes.length * 3);\n        for (int i = 0; i < bytes.length; i++) {\n            if (i != 0) hex.append(',');\n            hex.append(String.format(Locale.ENGLISH, \"%02x\", bytes[i] & 255));\n        }\n        setRawValue(key, name, \"hex(7):\" + hex.toString());\n    }\n\n    public void setHexValues(String key, String name, byte[] bytes) {")
replace("winlator/app/src/main/java/com/winlator/d2/D2LaunchActivity.java", "            user.setDwordValue(REG_KEY, \"Mini Panel\", 1);", "            user.setMultiStringValue(\"Software\\\\Battle.net\\\\Configuration\",\n                \"Diablo II Battle.net gateways\",\n                \"1002\", \"01\", \"play.slashdiablo.net\", \"0\", \"SlashDiablo\");\n            user.setStringValue(REG_KEY, \"BNETIP\", \"play.slashdiablo.net\");\n            user.removeValue(\"Software\\\\Battle.net\\\\Configuration\", \"Override Battle.net gateways\");\n\n            user.setDwordValue(REG_KEY, \"Mini Panel\", 1);")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "    private static final String[] MOD_FILES = {LOADER_EXE, \"d2android-mod.dll\"};", "    private static final String[] MOD_FILES = {LOADER_EXE, \"d2android-mod.dll\"};\n    private static final String BH_DLL_ASSET = \"d2/bh/BH.dll\";\n    private static final String BH_SETTINGS_ASSET = \"d2/bh/BH_settings.cfg\";\n    private static final String BH_ITEMS_ASSET = \"d2/bh/BH.cfg\";")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        if (isModBundled(context)) {\n            for (String name : MOD_FILES) FileUtils.copy(context, MOD_ASSET_DIR + name, new File(shadowDir, name));\n        }", "        if (isModBundled(context)) {\n            for (String name : MOD_FILES) FileUtils.copy(context, MOD_ASSET_DIR + name, new File(shadowDir, name));\n        }\n\n        // BH experiment: install separately after the original D2Android files.\n        // Create Download/SlashDiabloMobile/BH_DISABLED.txt to revert to the same\n        // behavior as the confirmed working online build without uninstalling.\n        File bhDisabled = new File(android.os.Environment.getExternalStoragePublicDirectory(\n            android.os.Environment.DIRECTORY_DOWNLOADS), \"SlashDiabloMobile/BH_DISABLED.txt\");\n        File bhDll = new File(shadowDir, \"BH.dll\");\n        File bhSettings = new File(shadowDir, \"BH_settings.cfg\");\n        File bhItems = new File(shadowDir, \"BH.cfg\");\n        for (File file : new File[]{bhDll, bhSettings, bhItems}) {\n            if (file.exists() && !file.delete()) throw new IOException(\"Cannot reset BH test file: \" + file);\n        }\n        if (!bhDisabled.isFile() && isModBundled(context)) {\n            FileUtils.copy(context, BH_DLL_ASSET, bhDll);\n            FileUtils.copy(context, BH_SETTINGS_ASSET, bhSettings);\n            FileUtils.copy(context, BH_ITEMS_ASSET, bhItems);\n            if (!bhDll.isFile() || bhDll.length() < 100000L)\n                throw new IOException(\"BH DLL missing from experimental APK\");\n        }")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        return lower.equals(\"glide3x.dll\") || lower.equals(\"d2dx.cfg\") || lower.equals(\"ddraw.dll\")", "        return lower.equals(\"bh.dll\") || lower.equals(\"bh_settings.cfg\") || lower.equals(\"bh.cfg\")\n            || lower.equals(\"glide3x.dll\") || lower.equals(\"d2dx.cfg\") || lower.equals(\"ddraw.dll\")")
replace("mod/d2mod.c", "void gameLoopHook(void);\n__asm__(\n    \".text\\n\"\n    \".globl _gameLoopHook\\n\"\n    \"_gameLoopHook:\\n\"\n    \"    pushal\\n\"\n    \"    call _onGameLoop\\n\"\n    \"    popal\\n\"\n    \"    popl %eax\\n\"\n    \"    subl $0x20, %esp\\n\"\n    \"    movl %ecx, 0x0C(%esp)\\n\"\n    \"    pushl %eax\\n\"\n    \"    ret\\n\"\n);", "// BH uses the same 1.13d D2Client+0x45280 hook as D2Android.\n// When BH loads, keep D2Android's game tick and tail-jump into the BH\n// interceptor so both handlers run in the original calling convention.\nvolatile DWORD bhGameLoopTarget;\nvoid gameLoopHook(void);\n__asm__(\n    \".text\\n\"\n    \".globl _gameLoopHook\\n\"\n    \"_gameLoopHook:\\n\"\n    \"    pushal\\n\"\n    \"    call _onGameLoop\\n\"\n    \"    popal\\n\"\n    \"    pushfl\\n\"\n    \"    cmpl $0, _bhGameLoopTarget\\n\"\n    \"    je 1f\\n\"\n    \"    popfl\\n\"\n    \"    jmp *_bhGameLoopTarget\\n\"\n    \"1:\\n\"\n    \"    popfl\\n\"\n    \"    popl %eax\\n\"\n    \"    subl $0x20, %esp\\n\"\n    \"    movl %ecx, 0x0C(%esp)\\n\"\n    \"    pushl %eax\\n\"\n    \"    ret\\n\"\n);")
replace("mod/d2mod.c", "static int portFromEnv(const char* name, int fallback) {", "// The D2Android setup thread continues polling after startup. Only reclaim\n// the shared game-loop hook when the replacement target belongs to BH.dll.\nstatic void bhChainTick(void) {\n    if (!client || bhGameLoopTarget) return;\n    HMODULE bh = GetModuleHandleA(\"BH.dll\");\n    if (!bh) return;\n    BYTE* site = (BYTE*) (client + GAMELOOP_PATCH_RVA);\n    if (!readable(site, 7) || site[0] != 0xE8 || site[5] != 0x90 || site[6] != 0x90) return;\n    DWORD target = (DWORD) (site + 5) + *(LONG*) (site + 1);\n    if (target == (DWORD) gameLoopHook) return;\n    MEMORY_BASIC_INFORMATION info;\n    if (VirtualQuery((void*) target, &info, sizeof(info)) != sizeof(info)\n        || info.AllocationBase != bh) {\n        logLine(\"BH chain: different module replaced the game loop; not changing hooks\");\n        return;\n    }\n    DWORD old;\n    if (!VirtualProtect(site, 7, PAGE_EXECUTE_READWRITE, &old)) return;\n    BYTE bytes[7] = {0xE8, 0, 0, 0, 0, 0x90, 0x90};\n    *(LONG*) (bytes + 1) = (LONG) ((DWORD) gameLoopHook - ((DWORD) site + 5));\n    InterlockedExchange((volatile LONG*) &bhGameLoopTarget, (LONG) target);\n    *(volatile WORD*) site = 0xFEEB; // temporarily spin during the 7-byte patch\n    FlushInstructionCache(GetCurrentProcess(), site, 7);\n    memcpy(site + 2, bytes + 2, 5);\n    *(volatile WORD*) site = *(WORD*) bytes;\n    VirtualProtect(site, 7, old, &old);\n    FlushInstructionCache(GetCurrentProcess(), site, 7);\n    logLine(\"BH chain: D2Android controls and BH game-loop callbacks active\");\n}\n\nstatic int portFromEnv(const char* name, int fallback) {")
replace("mod/d2mod.c", "    for (;;) {\n        sendStatus();", "    for (;;) {\n        bhChainTick();\n        sendStatus();")
replace("mod/d2mod.c", "static void gameTick(void) {", "// BH is loaded from inside Game.exe, not through Wine's cross-process APIs.\n// The external launcher could never observe D2Client's player pointer, even\n// though the already-injected D2Android DLL saw the online character correctly.\nstatic volatile LONG bhLoadScheduled;\nstatic DWORD WINAPI bhInProcessLoad(LPVOID unused) {\n    (void) unused;\n    Sleep(1500); // allow the first online frame and the core DLLs to settle\n    char dllPath[MAX_PATH];\n    DWORD length = GetModuleFileNameA(hSelf, dllPath, sizeof(dllPath));\n    if (!length || length >= sizeof(dllPath) - 9) {\n        logLine(\"BH retry 04: cannot resolve D2Android module path (%lu)\", GetLastError());\n        return 0;\n    }\n    char* file = strrchr(dllPath, '\\\\');\n    if (!file) {\n        logLine(\"BH retry 04: module path has no parent directory\");\n        return 0;\n    }\n    strcpy(file + 1, \"BH.dll\");\n    DWORD attributes = GetFileAttributesA(dllPath);\n    if (attributes == INVALID_FILE_ATTRIBUTES || (attributes & FILE_ATTRIBUTE_DIRECTORY)) {\n        logLine(\"BH retry 04: BH.dll absent (disabled, missing asset, or wrong folder)\");\n        return 0;\n    }\n    logLine(\"BH retry 04: loading BH.dll inside Game.exe after online character appeared\");\n    flushLog();\n    SetLastError(0);\n    HMODULE module = LoadLibraryA(dllPath);\n    DWORD error = module ? 0 : GetLastError();\n    logLine(module\n        ? \"BH retry 04: BH.dll LoadLibrary succeeded (module 0x%08lX)\"\n        : \"BH retry 04: BH.dll LoadLibrary FAILED (Win32 error %lu)\",\n        (unsigned long)(module ? (DWORD)module : error));\n    flushLog();\n    return 0;\n}\n\nstatic void bhScheduleOnOnlineJoin(void* hero) {\n    if (!hero || singlePlayerGame()) return;\n    if (InterlockedCompareExchange(&bhLoadScheduled, 1, 0) != 0) return;\n    logLine(\"BH retry 04: online hero detected by D2Android; scheduling internal LoadLibrary\");\n    HANDLE thread = CreateThread(NULL, 0, bhInProcessLoad, NULL, 0, NULL);\n    if (!thread) {\n        logLine(\"BH retry 04: internal loader thread failed (error %lu)\", GetLastError());\n    } else CloseHandle(thread);\n}\n\nstatic void gameTick(void) {")
replace("mod/d2mod.c", "    void* player = fGetPlayerUnit();\n    DWORD now = GetTickCount();", "    void* player = fGetPlayerUnit();\n    bhScheduleOnOnlineJoin(player);\n    DWORD now = GetTickCount();")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "    private static final String BH_DLL_ASSET = \"d2/bh/BH.dll\";", "    private static final String BH_DLL_ASSET = \"d2/bh/BH.dll\";\n    private static final String BH_STORMLIB_ASSET = \"d2/bh/StormLib.dll\";")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        File bhDll = new File(shadowDir, \"BH.dll\");", "        File bhDll = new File(shadowDir, \"BH.dll\");\n        File bhStormLib = new File(shadowDir, \"StormLib.dll\");")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        for (File file : new File[]{bhDll, bhSettings, bhItems}) {", "        for (File file : new File[]{bhDll, bhStormLib, bhSettings, bhItems}) {")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "            FileUtils.copy(context, BH_DLL_ASSET, bhDll);\n            FileUtils.copy(context, BH_SETTINGS_ASSET, bhSettings);", "            FileUtils.copy(context, BH_DLL_ASSET, bhDll);\n            FileUtils.copy(context, BH_STORMLIB_ASSET, bhStormLib);\n            FileUtils.copy(context, BH_SETTINGS_ASSET, bhSettings);")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "            if (!bhDll.isFile() || bhDll.length() < 100000L)\n                throw new IOException(\"BH DLL missing from experimental APK\");", "            if (!bhDll.isFile() || bhDll.length() < 100000L)\n                throw new IOException(\"BH DLL missing from experimental APK\");\n            if (!bhStormLib.isFile() || bhStormLib.length() < 100000L)\n                throw new IOException(\"BH StormLib.dll dependency missing from experimental APK\");\n            File gamePatchMpq = new File(gameDir, \"Patch_D2.mpq\");\n            if (!gamePatchMpq.isFile())\n                throw new IOException(\"BH needs Patch_D2.mpq in the selected Diablo II game folder\");")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        return lower.equals(\"bh.dll\") || lower.equals(\"bh_settings.cfg\") || lower.equals(\"bh.cfg\")", "        return lower.equals(\"bh.dll\") || lower.equals(\"stormlib.dll\") || lower.equals(\"bh_settings.cfg\") || lower.equals(\"bh.cfg\")")
for path,value in changes.items(): path.write_text(value,encoding="utf-8")
print("Patched",len(changes),"upstream source files")
