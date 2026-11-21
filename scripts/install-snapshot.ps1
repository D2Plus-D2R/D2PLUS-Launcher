param([Parameter(Mandatory=$true)][string]$RequestFile)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$request=Get-Content -LiteralPath $RequestFile -Raw | ConvertFrom-Json
Add-Type -AssemblyName System.IO.Compression.FileSystem
function FileHash([string]$p) {
 $stream=[IO.File]::OpenRead($p);$hasher=[Security.Cryptography.SHA256]::Create()
 try {return [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant()} finally {$stream.Dispose();$hasher.Dispose()}
}
function ArchivePath([string]$relative) {
 if (!$relative -or $relative -match '(^/|:|[\x00-\x1f]|(^|/)\.\.?(/|$))' -or $relative.Contains('\') -or $relative -match '//|[. ](/|$)' -or $relative -notmatch '^(D2RMM\.mpq/|INSTALL_MANIFEST\.json$|README_INSTALL\.txt$)') { throw 'Unexpected gameplay archive path.' }
 $output=[IO.Path]::GetFullPath((Join-Path $stage $relative))
 if (!$output.StartsWith($stage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path leaves staging folder.' }
 return $output
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
$backup=Join-Path $mods ($name+'.before-v20b-'+$stamp)
$promoted=$false;$backedUp=$false
try {
 try { [void][IO.Directory]::CreateDirectory($stage) } catch { throw 'Windows denied access to the game folder. Close the launcher, right-click D2PLUS Launcher and choose Run as administrator, then install again.' }
 $zip=[IO.Compression.ZipFile]::OpenRead($archive)
 try {
  # The ZIP is SHA-256 authenticated before trusting its embedded size manifest.
  # Bound metadata and total extraction independently, rather than limiting the
  # expanded package to 2 GiB (the shipped V2.0a package exceeds that).
  if($zip.Entries.Count -gt 100000){throw 'Too many gameplay archive entries.'}
  $manifestEntry=$zip.GetEntry('INSTALL_MANIFEST.json')
  if(!$manifestEntry -or $manifestEntry.Length -gt 8388608){throw 'Missing or oversized gameplay manifest.'}
  $reader=[IO.StreamReader]::new($manifestEntry.Open())
  try{$manifestText=$reader.ReadToEnd();$manifest=$manifestText|ConvertFrom-Json}finally{$reader.Dispose()}
  if(!$manifest.files.Count -or $manifest.files.Count -gt 100000){throw 'Invalid gameplay manifest.'}
  $declared=@{};[long]$expected=0
  foreach($file in $manifest.files){
   $relative=[string]$file.path;$p=ArchivePath $relative
   if($relative -notmatch '^D2RMM\.mpq/data/' -or $relative.EndsWith('/') -or $declared.ContainsKey($p) -or [string]$file.sha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'Invalid or duplicate manifest file.'}
   $size=0L
   if(![long]::TryParse([string]$file.size,[ref]$size) -or $size -lt 0 -or $size -gt 4294967296){throw 'Invalid manifest file size.'}
   $expected+=$size
   if($expected -gt 17179869184){throw 'Gameplay archive exceeds the supported expanded-size limit.'}
   $declared[$p]=$file
  }
  $seen=@{};[long]$total=0;[long]$payload=0
  foreach($entry in $zip.Entries) {
   $relative=$entry.FullName;$output=ArchivePath $relative
   if ($seen.ContainsKey($output)) { throw 'Duplicate archive path.' };$seen[$output]=$true
   if($relative.EndsWith('/')){if($entry.Length -ne 0){throw 'Invalid directory entry.'};continue}
   if($relative -eq 'INSTALL_MANIFEST.json' -or $relative -eq 'README_INSTALL.txt'){
    if($entry.Length -gt 8388608){throw 'Oversized gameplay metadata.'}
   }else{
    if(!$declared.ContainsKey($output) -or $entry.Length -ne [long]$declared[$output].size){throw 'Archive contents differ from the authenticated gameplay manifest.'}
    $payload+=$entry.Length
   }
   $total+=$entry.Length
  }
  foreach($p in $declared.Keys){if(!$seen.ContainsKey($p)){throw 'A manifest file is missing from the archive.'}}
  if($payload -ne $expected){throw 'Expanded gameplay size differs from manifest.'}
  $drive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($stage))
  if($drive.AvailableFreeSpace -lt ($total+268435456)){throw ('Not enough free space on '+$drive.Name+'. Free at least '+[math]::Ceiling(($total+268435456-$drive.AvailableFreeSpace)/1MB)+' MiB and retry; the existing mod is unchanged.')}
  [IO.Compression.ZipFileExtensions]::ExtractToDirectory($zip,$stage)
 } finally {$zip.Dispose()}
 foreach($file in $manifest.files) {
  $p=[IO.Path]::GetFullPath((Join-Path $stage $file.path))
  if (!$p.StartsWith($stage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {throw 'Invalid manifest path.'}
  if ((Get-Item -LiteralPath $p).Length -ne [long]$file.size -or (FileHash $p) -ne $file.sha256) {throw ('Installed file verification failed: '+$file.path)}
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
 $receipt=@{schemaVersion=1;archiveSHA256=[string]$request.sha256;manifestSHA256=(FileHash (Join-Path $stage 'INSTALL_MANIFEST.json'));modName=$name;gameplayVersion=[string]$manifest.version;fileCount=$manifest.files.Count;expandedBytes=$expected;installedAt=[DateTime]::UtcNow.ToString('o')}
 [IO.File]::WriteAllText((Join-Path $stage 'D2PLUS-INSTALL-RECEIPT.json'),($receipt|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
 if(Test-Path -LiteralPath $target){Move-Item -LiteralPath $target -Destination $backup;$backedUp=$true}
 try{Move-Item -LiteralPath $stage -Destination $target;$promoted=$true}
 catch{if($backedUp -and !(Test-Path -LiteralPath $target)){Move-Item -LiteralPath $backup -Destination $target};throw}
 @{installed=$true;directory=$target;backup=$(if($backedUp){$backup}else{''});savepath=$savepath;version='2.0.2-alpha'} | ConvertTo-Json -Compress
} finally {
 if(!$promoted -and (Test-Path -LiteralPath $stage)){
  $resolved=[IO.Path]::GetFullPath($stage)
  if([IO.Path]::GetDirectoryName($resolved) -eq $mods -and [IO.Path]::GetFileName($resolved) -eq ('.d2plus-stage-'+$stamp)) {Remove-Item -LiteralPath $resolved -Recurse -Force}
 }
}
