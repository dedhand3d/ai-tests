$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $root 'public\voices'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$texts = [System.Collections.Generic.HashSet[string]]::new()
foreach ($file in @('encounters.ts', 'state.ts', 'content.ts')) {
    $source = Get-Content (Join-Path $root "src\$file") -Raw
    foreach ($match in [regex]::Matches($source, '"([^"\r\n]+)"')) {
        $text = $match.Groups[1].Value
        if ($text.Length -ge 12 -and !$text.Contains('${') -and !$text.Contains('<')) {
            [void]$texts.Add($text.Replace("\'", "'"))
        }
    }
    if ($file -eq 'encounters.ts') {
        foreach ($match in [regex]::Matches($source, "(?:return |^\s*)'([^'\r\n]{25,})'", 'Multiline')) {
            $text = $match.Groups[1].Value
            if (!$text.StartsWith('[') -and !$text.StartsWith('Everything goes dark.')) { [void]$texts.Add($text) }
        }
    }
}
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$speaker.Rate = -1
$speaker.Volume = 95
$manifest = [ordered]@{}
try {
    $index = 0
    foreach ($text in ($texts | Sort-Object)) {
        $name = 'line-{0:D3}.wav' -f $index
        $speaker.SetOutputToWaveFile((Join-Path $destination $name))
        $speaker.Speak($text)
        $speaker.SetOutputToNull()
        $manifest[$text] = "voices/$name"
        $index++
    }
    $manifest | ConvertTo-Json | Set-Content (Join-Path $destination 'manifest.json') -Encoding UTF8
    Write-Output "Generated $index local spoken dialogue clips."
} finally {
    $speaker.Dispose()
}