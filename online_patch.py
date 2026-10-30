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
"applicationId 'at.d2android'","applicationId 'at.slashmobi'")
replace("winlator/app/build.gradle",
"resValue 'string', 'app_name', 'D2Android'",
"resValue 'string', 'app_name', 'SlashDiablo Touch Alpha'")
replace("winlator/app/build.gradle",
"resValue 'string', 'd2launch_label', 'D2Android'",
"resValue 'string', 'd2launch_label', 'SlashDiablo Touch Alpha'")
replace("winlator/gradle.properties",
"d2PublicPackage=at.d2andrpub","d2PublicPackage=at.slashmobi")
for path,value in changes.items(): path.write_text(value,encoding="utf-8")
print("Patched",len(changes),"upstream source files")
