# Parse data/prophetic-events.source.txt into nested JSON the chart reads.
# Order comes from the Google Doc MAIN BODY, not the table of contents at the top
# and not the Word outline. Re-run: powershell -File scripts/parse-prophetic-events.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root "data\prophetic-events.source.txt"
$eventsPath = Join-Path $root "data\prophetic-events.json"
$scripturesPath = Join-Path $root "data\scriptures.json"
$messianicPath = Join-Path $root "data\messianic-prophecies.json"

$books = @(
  @{ name = "1 Chronicles"; aliases = @("1 chronicles","1 chr") },
  @{ name = "2 Chronicles"; aliases = @("2 chronicles","2 chr") },
  @{ name = "1 Corinthians"; aliases = @("1 corinthians","1 cor") },
  @{ name = "2 Corinthians"; aliases = @("2 corinthians","2 cor") },
  @{ name = "1 John"; aliases = @("1 john") },
  @{ name = "1 Kings"; aliases = @("1 kings","1 kgs") },
  @{ name = "2 Kings"; aliases = @("2 kings","2 kgs") },
  @{ name = "1 Nephi"; aliases = @("1 nephi","1 ne") },
  @{ name = "2 Nephi"; aliases = @("2 nephi","2 ne") },
  @{ name = "3 Nephi"; aliases = @("3 nephi","3 ne") },
  @{ name = "4 Nephi"; aliases = @("4 nephi","4 ne") },
  @{ name = "1 Peter"; aliases = @("1 peter","1 pet") },
  @{ name = "2 Peter"; aliases = @("2 peter","2 pet") },
  @{ name = "1 Samuel"; aliases = @("1 samuel","1 sam") },
  @{ name = "2 Samuel"; aliases = @("2 samuel","2 sam") },
  @{ name = "1 Thessalonians"; aliases = @("1 thessalonians","1 thess") },
  @{ name = "2 Thessalonians"; aliases = @("2 thessalonians","2 thess") },
  @{ name = "1 Timothy"; aliases = @("1 timothy","1 tim") },
  @{ name = "2 Timothy"; aliases = @("2 timothy","2 tim") },
  @{ name = "Doctrine and Covenants"; aliases = @("doctrine and covenants","d&c","dc","d & c") },
  @{ name = "JS-Matthew"; aliases = @("js-matthew","js-m","jsm","joseph smith matthew") },
  @{ name = "JS-History"; aliases = @("js-history","js-h","jsh") },
  @{ name = "Song of Solomon"; aliases = @("song of solomon","song of songs") },
  @{ name = "Title Page of Book of Mormon"; aliases = @("title page of book of mormon") },
  @{ name = "White Horse Prophecy"; aliases = @("white horse prophecy") },
  @{ name = "Zenok"; aliases = @("zenok") },
  @{ name = "Neum"; aliases = @("neum") },
  @{ name = "Revelation"; aliases = @("revelation","rev") },
  @{ name = "Deuteronomy"; aliases = @("deuteronomy","deut") },
  @{ name = "Ecclesiastes"; aliases = @("ecclesiastes","eccl") },
  @{ name = "Lamentations"; aliases = @("lamentations","lam") },
  @{ name = "Philippians"; aliases = @("philippians","phil") },
  @{ name = "Colossians"; aliases = @("colossians","col") },
  @{ name = "Zechariah"; aliases = @("zechariah","zech") },
  @{ name = "Genesis"; aliases = @("genesis","gen") },
  @{ name = "Exodus"; aliases = @("exodus","ex") },
  @{ name = "Leviticus"; aliases = @("leviticus","lev") },
  @{ name = "Numbers"; aliases = @("numbers","num") },
  @{ name = "Joshua"; aliases = @("joshua","josh") },
  @{ name = "Judges"; aliases = @("judges","judg") },
  @{ name = "Ruth"; aliases = @("ruth") },
  @{ name = "Ezra"; aliases = @("ezra") },
  @{ name = "Nehemiah"; aliases = @("nehemiah","neh") },
  @{ name = "Esther"; aliases = @("esther","esth") },
  @{ name = "Job"; aliases = @("job") },
  @{ name = "Psalms"; aliases = @("psalms","psalm","ps") },
  @{ name = "Proverbs"; aliases = @("proverbs","prov") },
  @{ name = "Isaiah"; aliases = @("isaiah","isa") },
  @{ name = "Jeremiah"; aliases = @("jeremiah","jer") },
  @{ name = "Ezekiel"; aliases = @("ezekiel","ezek") },
  @{ name = "Daniel"; aliases = @("daniel","dan") },
  @{ name = "Hosea"; aliases = @("hosea","hos") },
  @{ name = "Joel"; aliases = @("joel") },
  @{ name = "Amos"; aliases = @("amos") },
  @{ name = "Obadiah"; aliases = @("obadiah","obad") },
  @{ name = "Jonah"; aliases = @("jonah") },
  @{ name = "Micah"; aliases = @("micah","mic") },
  @{ name = "Nahum"; aliases = @("nahum","nah") },
  @{ name = "Habakkuk"; aliases = @("habakkuk","hab") },
  @{ name = "Zephaniah"; aliases = @("zephaniah","zeph") },
  @{ name = "Haggai"; aliases = @("haggai","hag") },
  @{ name = "Malachi"; aliases = @("malachi","mal") },
  @{ name = "Matthew"; aliases = @("matthew","matt") },
  @{ name = "Mark"; aliases = @("mark") },
  @{ name = "Luke"; aliases = @("luke") },
  @{ name = "John"; aliases = @("john") },
  @{ name = "Acts"; aliases = @("acts") },
  @{ name = "Romans"; aliases = @("romans","rom") },
  @{ name = "Galatians"; aliases = @("galatians","gal") },
  @{ name = "Ephesians"; aliases = @("ephesians","eph") },
  @{ name = "Titus"; aliases = @("titus") },
  @{ name = "Philemon"; aliases = @("philemon","phlm") },
  @{ name = "Hebrews"; aliases = @("hebrews","heb") },
  @{ name = "James"; aliases = @("james","jas") },
  @{ name = "Jude"; aliases = @("jude") },
  @{ name = "Mosiah"; aliases = @("mosiah") },
  @{ name = "Jacob"; aliases = @("jacob") },
  @{ name = "Ether"; aliases = @("ether") },
  @{ name = "Moroni"; aliases = @("moroni") }
) | Sort-Object { - $_.aliases[0].Length }

function Normalize-Dashes([string]$s) {
  if ($null -eq $s) { return "" }
  $s = $s -replace "[\u2013\u2014\u2212]", "-"
  $s = $s -replace "[\u2018\u2019\u0060]", "'"
  $s = $s -replace "[\u201C\u201D]", '"'
  return ($s -replace "\s+", " ").Trim()
}

function Match-Book([string]$fragment) {
  $lower = $fragment.ToLowerInvariant().Trim()
  foreach ($book in $books) {
    foreach ($alias in $book.aliases) {
      if ($lower.StartsWith($alias)) {
        $rest = $fragment.Substring($alias.Length).Trim().TrimStart(".").Trim()
        return @{ book = $book.name; rest = $rest }
      }
    }
  }
  return $null
}

function Parse-Citations([string]$raw) {
  $text = Normalize-Dashes $raw
  $text = $text -replace "[\(\)]", ""
  $text = $text.Trim().TrimEnd(".").Trim()
  if (-not $text) { return @() }
  $parts = @($text -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $out = New-Object System.Collections.Generic.List[object]
  $currentBook = $null
  foreach ($part in $parts) {
    $hit = Match-Book $part
    if ($hit) {
      $currentBook = $hit.book
      $rest = $hit.rest
    } else {
      $rest = $part
    }
    if (-not $currentBook) { continue }
    if (-not $rest) {
      $out.Add(@{ book = $currentBook; reference = $currentBook })
      continue
    }
    # "2, 16, 22, 110" after Psalms, or "7:4" carrying Daniel
    if ($rest -match "^\d" -or $rest -match "^:") {
      $out.Add(@{ book = $currentBook; reference = "$currentBook $rest" })
    } else {
      $out.Add(@{ book = $currentBook; reference = "$currentBook $rest" })
    }
  }
  return $out.ToArray()
}

function New-Event($id, $title, $time, $summary, $scriptures) {
  $refs = @()
  foreach ($s in $scriptures) { $refs += $s.reference }
  return [ordered]@{
    id = $id
    title = $title
    time = $time
    summary = $summary
    scriptures = $refs
    children = @()
  }
}

$lines = Get-Content -LiteralPath $sourcePath
$started = $false
$epochs = New-Object System.Collections.Generic.List[object]
$current1 = $null
$current2 = $null
$pending3 = $null
$epochCount = 0

function Flush-Pending3 {
  param($into)
  if ($script:pending3 -and $into) {
    $into.children += $script:pending3
  }
  $script:pending3 = $null
}

function Is-Skip([string]$line) {
  if ($line -match "Return to Table of Contents") { return $true }
  if ($line -match "^IS THERE A 20") { return $true }
  if ($line -match "^\[a\]") { return $true }
  if ($line -match "^\[b\]") { return $true }
  if ($line -match "^STICKY HEADER") { return $true }
  if ($line -match "^-+$") { return $true }
  return $false
}

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = Normalize-Dashes $lines[$i]
  if (-not $started) {
    if ($line -match "^MOSAIC DISPENSATIONAL PATTERN" -and $i -gt 40) { $started = $true }
    else { continue }
  }
  if (-not $line) { continue }
  if (Is-Skip $line) { continue }

  if ($line -match "^Timeframe:\s*(.+)$") {
    $chunk = $Matches[1]
    $time = $chunk
    $refsRaw = ""
    $pipeAt = $chunk.IndexOf("|")
    if ($pipeAt -ge 0) {
      $time = $chunk.Substring(0, $pipeAt).Trim()
      $after = $chunk.Substring($pipeAt + 1).Trim()
      if ($after -match "Key References:\s*(.+)$") { $refsRaw = $Matches[1] }
    }
    $time = ($time -replace "^Timeframe:\s*", "").Trim()
    if ($current1) {
      $current1.time = $time
      if ($refsRaw) {
        $parsed = Parse-Citations $refsRaw
        $current1.scriptures = @($parsed | ForEach-Object { $_.reference })
      }
    }
    continue
  }

  if ($line -match "^(\d+)\.(\d+)\s+(.+)$") {
    Flush-Pending3 $current2
    $title = $Matches[3].Trim()
    $id = "$($current1.id).$($current1.children.Count + 1)"
    $current2 = New-Event $id $title $null "" @()
    $current1.children += $current2
    continue
  }

  $firstCode = if ($line.Length) { [int][char]$line[0] } else { 0 }
  if ($firstCode -eq 0x25AA -or $firstCode -eq 0x2022 -or $line.StartsWith("* ")) {
    Flush-Pending3 $current2
    $title = $line.Substring(1).Trim().TrimStart("*").Trim()
    $parent = $current2
    if (-not $parent) { $parent = $current1 }
    $id = "$($parent.id).$($parent.children.Count + 1)"
    $pending3 = New-Event $id $title $null "" @()
    continue
  }

  # 1st-order heading: mostly uppercase letters, not a numbered child
  $letters = [regex]::Replace($line, "[^A-Za-z]", "")
  $upperCount = 0
  foreach ($ch in $letters.ToCharArray()) {
    if ([char]::IsUpper($ch)) { $upperCount++ }
  }
  $upperRatio = if ($letters.Length) { $upperCount / $letters.Length } else { 0 }
  $isHeading = $letters.Length -gt 12 -and $upperRatio -gt 0.82 -and
    $line -notmatch "^\d+\.\d+" -and
    $line -notmatch "^Timeframe"
  if ($isHeading -and $line -notmatch "Key References") {
    Flush-Pending3 $current2
    $epochCount += 1
    $title = ($line -replace "^\d+\.\s+", "").Trim()
    $title = ($title -replace "\[a\]", "").Trim()
    $title = ($title -replace "\[b\]", "").Trim()
    $title = ($title -replace "\s+/", " /").Trim()
    $current1 = New-Event "$epochCount" $title $null "" @()
    $current2 = $null
    $epochs.Add($current1)
    continue
  }

  if ($pending3) {
    $summary = $line
    $refsRaw = ""
    $dashAt = $line.LastIndexOf(" - (")
    if ($dashAt -lt 0) { $dashAt = $line.LastIndexOf(" -(") }
    if ($dashAt -ge 0 -and $line.EndsWith(")")) {
      $refsRaw = $line.Substring($dashAt)
      $refsRaw = $refsRaw.TrimStart(" -").Trim().Trim("(").TrimEnd(")")
      $summary = $line.Substring(0, $dashAt).Trim()
    } elseif ($line -match "\((.+)\)\s*$" -and $line -match ":\d") {
      $refsRaw = $Matches[1]
      $summary = ($line -replace "\s*\(.+\)\s*$", "").Trim()
    }
    $pending3.summary = $summary
    if ($refsRaw) {
      $parsed = Parse-Citations $refsRaw
      $pending3.scriptures = @($parsed | ForEach-Object { $_.reference })
    }
    if ($current2) { $current2.children += $pending3 }
    elseif ($current1) { $current1.children += $pending3 }
    $pending3 = $null
    continue
  }

  if ($current1 -and -not $current1.summary -and $line -notmatch "^\d+\.\d+") {
    $current1.summary = $line
  }
}
Flush-Pending3 $current2

$seq = 1
$final = @()
foreach ($epoch in $epochs) {
  $epoch.id = "$seq"
  $c2 = 1
  foreach ($phase in $epoch.children) {
    $phase.id = "$seq.$c2"
    $c3 = 1
    foreach ($leaf in $phase.children) {
      $leaf.id = "$seq.$c2.$c3"
      $c3++
    }
    $c2++
  }
  $final += $epoch
  $seq++
}

$eventsDoc = [ordered]@{
  howToEdit = "This file is the outline, in Google Doc BODY order (ignore the table of contents at the top of that doc). Reorder objects in events[] (and nested children[]) to rearrange the chart. Put scripture references on an event as strings; verse text is looked up from scriptures.json and is never stored here. time is the label drawn at the start of a 1st-order epoch. Leave children as [] when a heading has no nested events."
  title = "Chronological Outline of Scripture Prophecy"
  events = $final
}

$json = $eventsDoc | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText($eventsPath, $json, [Text.UTF8Encoding]::new($false))

function Collect-Refs($node, $bag) {
  foreach ($ref in $node.scriptures) { [void]$bag.Add($ref) }
  foreach ($child in $node.children) { Collect-Refs $child $bag }
}
$bag = New-Object "System.Collections.Generic.HashSet[string]"
foreach ($e in $final) { Collect-Refs $e $bag }

$messianic = Get-Content -Raw $messianicPath | ConvertFrom-Json
$passages = @{}
if ($messianic.passages) {
  $messianic.passages.PSObject.Properties | ForEach-Object {
    $passages[$_.Name] = $_.Value
  }
}
if (Test-Path $scripturesPath) {
  $existingDoc = Get-Content -Raw $scripturesPath | ConvertFrom-Json
  if ($existingDoc.passages) {
    $existingDoc.passages.PSObject.Properties | ForEach-Object {
      $verses = $_.Value.verses
      if ($verses -and $verses.Count -gt 0) { $passages[$_.Name] = $verses }
    }
  }
}

$bookOrder = @(
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah",
  "Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
  "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians",
  "Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy",
  "2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John",
  "3 John","Jude","Revelation",
  "1 Nephi","2 Nephi","Jacob","Mosiah","Alma","Helaman","3 Nephi","4 Nephi","Mormon","Ether","Moroni",
  "Doctrine and Covenants","JS-Matthew","JS-History","Title Page of Book of Mormon","Zenok","Neum",
  "White Horse Prophecy"
)

function Book-Of([string]$reference) {
  $hit = Match-Book $reference
  if ($hit) { return $hit.book }
  return $reference
}

$scriptureItems = @()
foreach ($ref in ($bag | Sort-Object)) {
  $book = Book-Of $ref
  $verses = @()
  if ($passages.ContainsKey($ref)) { $verses = $passages[$ref] }
  $scriptureItems += [ordered]@{
    book = $book
    reference = $ref
    verses = $verses
  }
}

$scriptureItems = $scriptureItems | Sort-Object {
  $i = [array]::IndexOf($bookOrder, $_.book)
  if ($i -lt 0) { $i = 800 }
  $ch = 0; $vs = 0
  if ($_.reference -match "(\d+)(?::(\d+))?") { $ch = [int]$Matches[1]; if ($Matches[2]) { $vs = [int]$Matches[2] } }
  "{0:D3}-{1:D4}-{2:D4}" -f $i, $ch, $vs
}

$scripturesDoc = [ordered]@{
  howToEdit = "Verse text for the timeline chart. The outline (prophetic-events.json) only stores reference strings. Add or edit verses here, keyed by the same reference text. Bible verses are King James (public domain). Restoration verses can be pasted in the same {n, text} shape."
  translation = "King James Version"
  bookOrder = $bookOrder
  passages = @{}
}
foreach ($item in $scriptureItems) {
  $scripturesDoc.passages[$item.reference] = [ordered]@{
    book = $item.book
    verses = $item.verses
  }
}

$sjson = $scripturesDoc | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($scripturesPath, $sjson, [Text.UTF8Encoding]::new($false))

Write-Output ("epochs={0} refs={1}" -f $final.Count, $bag.Count)
foreach ($e in $final) {
  $n2 = $e.children.Count
  $n3 = ($e.children | ForEach-Object { $_.children.Count } | Measure-Object -Sum).Sum
  Write-Output ("  {0}  {1}  (2nd={2} 3rd={3})" -f $e.id, $e.title, $n2, $n3)
}
