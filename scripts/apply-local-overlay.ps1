function Apply-LocalOverlay {
 param([Parameter(Mandatory=$true)][string]$OverlayRoot,[Parameter(Mandatory=$true)][string]$MpqRoot)
 $source=[IO.Path]::GetFullPath($OverlayRoot)
 $target=[IO.Path]::GetFullPath($MpqRoot)
 $manifest=Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
 if($manifest.version -ne '1.3.0-alpha' -or !$manifest.files.Count){throw 'Missing Alpha V1.3 overlay.'}
 $validated=@();$seen=@{}
 foreach($file in $manifest.files){
  $relative=[string]$file.path
  if($relative -notmatch '^data/' -or $relative -match '(^/|:|\\|(^|/)\.\.?(/|$))'){throw 'Invalid overlay path.'}
  $from=[IO.Path]::GetFullPath((Join-Path $source $relative));$to=[IO.Path]::GetFullPath((Join-Path $target $relative))
  if(!$from.StartsWith($source+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or !$to.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Overlay path leaves staging folder.'}
  if($seen.ContainsKey($to)){throw 'Duplicate overlay path.'};$seen[$to]=$true
  if((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256){throw ('Overlay checksum mismatch: '+$relative)}
  $validated+=@{source=$from;destination=$to}
 }
 $remove=@()
 foreach($relative in $manifest.removeCompiled){
  if($relative -notmatch '^data/global/excel/[a-zA-Z0-9_-]+\.bin$' -or !$seen.ContainsKey([IO.Path]::GetFullPath((Join-Path $target ($relative.Substring(0,$relative.Length-4)+'.txt'))))){throw 'Invalid compiled-table cleanup.'}
  $resolved=[IO.Path]::GetFullPath((Join-Path $target $relative))
  if(!$resolved.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Compiled path leaves staging folder.'}
  $remove+=$resolved
 }
 foreach($file in $validated){[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file.destination));Copy-Item -LiteralPath $file.source -Destination $file.destination -Force}
 foreach($resolved in $remove){if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Force}}
}
