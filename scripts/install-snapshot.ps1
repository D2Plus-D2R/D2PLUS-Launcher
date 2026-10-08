param([Parameter(Mandatory=$true)][string]$RequestFile)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$request=Get-Content -LiteralPath $RequestFile -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression.FileSystem
function FileHash([string]$p) {
 $stream=[IO.File]::OpenRead($p);$hasher=[Security.Cryptography.SHA256]::Create()
 try {return [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant()} finally {$stream.Dispose();$hasher.Dispose()}
}
$game=[IO.Path]::GetFullPath([string]$request.gameExe)
if ([IO.Path]::GetFileName($game) -ne 'D2R.exe' -or !(Test-Path -LiteralPath $game -PathType Leaf)) { throw 'Choose the installed D2R.exe first.' }
if (Get-Process -Name D2R -ErrorAction SilentlyContinue) { throw 'Close Diablo II: Resurrected before installing.' }
$name=[string]$request.modName
if ($name -notmatch '^[a-zA-Z0-9_-]+$') { throw 'The guided installer requires a mod folder name containing letters, numbers, underscores or dashes.' }
$mods=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($game)) 'mods'))
$target=[IO.Path]::GetFullPath((Join-Path $mods $name))
if ([IO.Path]::GetDirectoryName($target) -ne $mods) { throw 'Invalid installation destination.' }
foreach($p in @([IO.Path]::GetDirectoryName($game),$mods,$target)) {
 if ((Test-Path -LiteralPath $p) -and ((Get-Item -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Choose an installation with no junctions or symbolic links in its game/mod path.' }
}
$archive=[IO.Path]::GetFullPath([string]$request.archive)
if ((FileHash $archive) -ne $request.sha256) { throw 'Gameplay package checksum mismatch; installation stopped.' }
$stamp=[Guid]::NewGuid().ToString('N')
$stage=Join-Path $mods ('.d2plus-stage-'+$stamp)
$backup=Join-Path $mods ($name+'.before-v08-'+$stamp)
$promoted=$false;$backedUp=$false
try {
 try { [void][IO.Directory]::CreateDirectory($stage) } catch { throw 'Windows denied access to the game folder. Close the launcher, right-click D2PLUS Launcher and choose Run as administrator, then install again.' }
 $zip=[IO.Compression.ZipFile]::OpenRead($archive)
 try {
  $seen=@{};$total=0
  foreach($entry in $zip.Entries) {
   $relative=$entry.FullName.Replace('\','/')
   if ($relative -match '(^/|:|(^|/)\.\.?(/|$))' -or $relative -notmatch '^(D2RMM\.mpq/|INSTALL_MANIFEST\.json$|README_INSTALL\.txt$)') { throw 'Unexpected gameplay archive path.' }
   $output=[IO.Path]::GetFullPath((Join-Path $stage $relative))
   if (!$output.StartsWith($stage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path leaves staging folder.' }
   if ($seen.ContainsKey($output)) { throw 'Duplicate archive path.' };$seen[$output]=$true
   $total+=$entry.Length;if($total -gt 2147483648) {throw 'Gameplay archive is too large.'}
  }
  [IO.Compression.ZipFileExtensions]::ExtractToDirectory($zip,$stage)
 } finally {$zip.Dispose()}
 $manifest=Get-Content -LiteralPath (Join-Path $stage 'INSTALL_MANIFEST.json') -Raw | ConvertFrom-Json
 foreach($file in $manifest.files) {
  $p=[IO.Path]::GetFullPath((Join-Path $stage $file.path))
  if (!$p.StartsWith($stage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {throw 'Invalid manifest path.'}
  if ((FileHash $p) -ne $file.sha256) {throw ('Installed file verification failed: '+$file.path)}
 }
 $mpq=Join-Path $stage 'D2RMM.mpq'
 if (!(Test-Path -LiteralPath (Join-Path $mpq 'data/global/excel/skills.txt'))) {throw 'Incomplete gameplay package.'}
 # Retain an established mod savepath when upgrading a configured output.
 $savepath=$name;$priorInfo=Join-Path $target ($name+'.mpq/modinfo.json')
 if(Test-Path -LiteralPath $priorInfo){
  $prior=Get-Content -LiteralPath $priorInfo -Raw | ConvertFrom-Json
  if($prior.savepath){$savepath=[string]$prior.savepath}
 }
 if($savepath -notmatch '^[a-zA-Z0-9_ .-]+$' -or $savepath -in @('.','..')){throw 'The existing save path requires manual review; no files replaced.'}
 [IO.File]::WriteAllText((Join-Path $mpq 'modinfo.json'),(@{name=$name;savepath=$savepath}|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
 if($name -ne 'D2RMM'){Rename-Item -LiteralPath $mpq -NewName ($name+'.mpq')}
 if(Test-Path -LiteralPath $target){Move-Item -LiteralPath $target -Destination $backup;$backedUp=$true}
 try{Move-Item -LiteralPath $stage -Destination $target;$promoted=$true}
 catch{if($backedUp -and !(Test-Path -LiteralPath $target)){Move-Item -LiteralPath $backup -Destination $target};throw}
 @{installed=$true;directory=$target;backup=$(if($backedUp){$backup}else{''});savepath=$savepath;version='0.8.0-alpha'} | ConvertTo-Json -Compress
} finally {
 if(!$promoted -and (Test-Path -LiteralPath $stage)){
  $resolved=[IO.Path]::GetFullPath($stage)
  if([IO.Path]::GetDirectoryName($resolved) -eq $mods -and [IO.Path]::GetFileName($resolved) -eq ('.d2plus-stage-'+$stamp)) {Remove-Item -LiteralPath $resolved -Recurse -Force}
 }
}
