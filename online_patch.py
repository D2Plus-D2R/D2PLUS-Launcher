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
"applicationId 'at.d2android'","applicationId 'at.slashbh01'")
replace("winlator/app/build.gradle",
"resValue 'string', 'app_name', 'D2Android'",
"resValue 'string', 'app_name', 'SlashDiablo Touch BH Test'")
replace("winlator/app/build.gradle",
"resValue 'string', 'd2launch_label', 'D2Android'",
"resValue 'string', 'd2launch_label', 'SlashDiablo Touch BH Test'")
replace("winlator/gradle.properties",
"d2PublicPackage=at.d2andrpub","d2PublicPackage=at.slashbh01")
replace("winlator/app/src/main/java/com/winlator/core/WineRegistryEditor.java", "    public void setHexValues(String key, String name, byte[] bytes) {", "    public void setMultiStringValue(String key, String name, String... entries) {\n        if (entries == null || entries.length == 0) throw new IllegalArgumentException(\"Empty multi-string value\");\n        StringBuilder combined = new StringBuilder();\n        for (String entry : entries) {\n            if (entry == null || entry.indexOf((char) 0) >= 0)\n                throw new IllegalArgumentException(\"Invalid multi-string entry\");\n            combined.append(entry).append((char) 0);\n        }\n        combined.append((char) 0);\n        byte[] bytes = combined.toString().getBytes(java.nio.charset.StandardCharsets.UTF_16LE);\n        StringBuilder hex = new StringBuilder(bytes.length * 3);\n        for (int i = 0; i < bytes.length; i++) {\n            if (i != 0) hex.append(',');\n            hex.append(String.format(Locale.ENGLISH, \"%02x\", bytes[i] & 255));\n        }\n        setRawValue(key, name, \"hex(7):\" + hex.toString());\n    }\n\n    public void setHexValues(String key, String name, byte[] bytes) {")
replace("winlator/app/src/main/java/com/winlator/d2/D2LaunchActivity.java", "            user.setDwordValue(REG_KEY, \"Mini Panel\", 1);", "            user.setMultiStringValue(\"Software\\\\Battle.net\\\\Configuration\",\n                \"Diablo II Battle.net gateways\",\n                \"1002\", \"01\", \"play.slashdiablo.net\", \"0\", \"SlashDiablo\");\n            user.setStringValue(REG_KEY, \"BNETIP\", \"play.slashdiablo.net\");\n            user.removeValue(\"Software\\\\Battle.net\\\\Configuration\", \"Override Battle.net gateways\");\n\n            user.setDwordValue(REG_KEY, \"Mini Panel\", 1);")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "    private static final String[] MOD_FILES = {LOADER_EXE, \"d2android-mod.dll\"};", "    private static final String[] MOD_FILES = {LOADER_EXE, \"d2android-mod.dll\"};\n    private static final String BH_DLL_ASSET = \"d2/bh/BH.dll\";\n    private static final String BH_SETTINGS_ASSET = \"d2/bh/BH_settings.cfg\";\n    private static final String BH_ITEMS_ASSET = \"d2/bh/BH.cfg\";")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        if (isModBundled(context)) {\n            for (String name : MOD_FILES) FileUtils.copy(context, MOD_ASSET_DIR + name, new File(shadowDir, name));\n        }", "        if (isModBundled(context)) {\n            for (String name : MOD_FILES) FileUtils.copy(context, MOD_ASSET_DIR + name, new File(shadowDir, name));\n        }\n\n        // BH experiment: install separately after the original D2Android files.\n        // Create Download/SlashDiabloMobile/BH_DISABLED.txt to revert to the same\n        // behavior as the confirmed working online build without uninstalling.\n        File bhDisabled = new File(android.os.Environment.getExternalStoragePublicDirectory(\n            android.os.Environment.DIRECTORY_DOWNLOADS), \"SlashDiabloMobile/BH_DISABLED.txt\");\n        File bhDll = new File(shadowDir, \"BH.dll\");\n        File bhSettings = new File(shadowDir, \"BH_settings.cfg\");\n        File bhItems = new File(shadowDir, \"BH.cfg\");\n        for (File file : new File[]{bhDll, bhSettings, bhItems}) {\n            if (file.exists() && !file.delete()) throw new IOException(\"Cannot reset BH test file: \" + file);\n        }\n        if (!bhDisabled.isFile() && isModBundled(context)) {\n            FileUtils.copy(context, BH_DLL_ASSET, bhDll);\n            FileUtils.copy(context, BH_SETTINGS_ASSET, bhSettings);\n            FileUtils.copy(context, BH_ITEMS_ASSET, bhItems);\n            if (!bhDll.isFile() || bhDll.length() < 100000L)\n                throw new IOException(\"BH DLL missing from experimental APK\");\n        }")
replace("winlator/app/src/main/java/com/winlator/d2/GameShadow.java", "        return lower.equals(\"glide3x.dll\") || lower.equals(\"d2dx.cfg\") || lower.equals(\"ddraw.dll\")", "        return lower.equals(\"bh.dll\") || lower.equals(\"bh_settings.cfg\") || lower.equals(\"bh.cfg\")\n            || lower.equals(\"glide3x.dll\") || lower.equals(\"d2dx.cfg\") || lower.equals(\"ddraw.dll\")")
replace("mod/loader.c", "int main(void) {", "// Late-load BH only after the original D2Android launch path ran. BH 1.9.9\n// patches these Diablo DLLs; loading before them is dangerous.\nstatic int bhModulesReady(DWORD pid) {\n    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid);\n    if (snap == INVALID_HANDLE_VALUE) return 0;\n    static const char* names[] = {\n        \"D2Client.dll\", \"D2Win.dll\", \"D2Multi.dll\",\n        \"BnClient.dll\", \"D2MCPClient.dll\", \"D2Gfx.dll\"\n    };\n    int seen[6] = {0};\n    MODULEENTRY32 e;\n    e.dwSize = sizeof(e);\n    if (Module32First(snap, &e)) {\n        do {\n            for (int n = 0; n < 6; ++n)\n                if (lstrcmpiA(e.szModule, names[n]) == 0) seen[n] = 1;\n        } while (Module32Next(snap, &e));\n    }\n    CloseHandle(snap);\n    for (int n = 0; n < 6; ++n) if (!seen[n]) return 0;\n    return 1;\n}\n\nint main(void) {")
replace("mod/loader.c", "    WaitForSingleObject(pi.hProcess, INFINITE);\n    DWORD code = 0;", "    // Fail-safe BH experiment. Failure to inject BH never prevents the\n    // unmodified online D2Android client from running.\n    char bhPath[MAX_PATH];\n    snprintf(bhPath, sizeof(bhPath), \"%s\\\\BH.dll\", dir);\n    if (GetFileAttributesA(bhPath) != INVALID_FILE_ATTRIBUTES && haveMod) {\n        logLine(\"BH 1.9.9 test: waiting until Diablo game modules are loaded\");\n        int ready = 0;\n        for (int i = 0; i < 120; ++i) {\n            if (WaitForSingleObject(pi.hProcess, 0) == WAIT_OBJECT_0) break;\n            if (bhModulesReady(pi.dwProcessId)) { ready = 1; break; }\n            Sleep(1000);\n        }\n        if (ready && WaitForSingleObject(pi.hProcess, 0) == WAIT_TIMEOUT) {\n            Sleep(1500);\n            logLine(inject(pi.hProcess, pi.dwProcessId, bhPath)\n                ? \"BH test: DLL loaded\" : \"BH test: injection failed; game continues\");\n        }\n        else logLine(\"BH test: required game DLLs not ready; skipped safely\");\n    }\n    else logLine(\"BH test: disabled or DLL unavailable; original online controls only\");\n\n    WaitForSingleObject(pi.hProcess, INFINITE);\n    DWORD code = 0;")
for path,value in changes.items(): path.write_text(value,encoding="utf-8")
print("Patched",len(changes),"upstream source files")
