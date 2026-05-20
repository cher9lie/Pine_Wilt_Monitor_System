param(
    [string]$DocxPath,
    [string]$OutputPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($DocxPath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1

if ($null -eq $entry) {
    Write-Error "document.xml not found in $DocxPath"
    $zip.Dispose()
    exit 1
}

$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
$xmlContent = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

# Parse XML and extract text
[xml]$doc = $xmlContent
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$paragraphs = $doc.SelectNodes('//w:p', $ns)
$sb = New-Object System.Text.StringBuilder

foreach ($p in $paragraphs) {
    $textNodes = $p.SelectNodes('.//w:t', $ns)
    $line = ''
    foreach ($t in $textNodes) {
        $line += $t.InnerText
    }
    [void]$sb.AppendLine($line)
}

[System.IO.File]::WriteAllText($OutputPath, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "Extracted to $OutputPath"
