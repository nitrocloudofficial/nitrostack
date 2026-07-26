# Git Commit History Script for Remaining Files
# Distributes commits among team members from 09/04/2026 1:30 PM to 2:30 PM

# Team members configuration
$teamMembers = @(
    @{
        name = "Dinesh0203s"
        email = "dineshsenathipathi@gmail.com"
    },
    @{
        name = "prakashb96"
        email = "prakashbalakrishnan2005@gmail.com"
    },
    @{
        name = "Robert-Mithhran-Nema"
        email = "darktechtamil@gmail.com"
    },
    @{
        name = "sabariyuhendh"
        email = "yuhendhran@gmail.com"
    }
)

# Get all untracked files
Write-Host "Collecting untracked files to commit..." -ForegroundColor Cyan
$untrackedFiles = git ls-files --others --exclude-standard

if ($untrackedFiles.Count -eq 0) {
    Write-Host "No untracked files found." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($untrackedFiles.Count) untracked files to commit" -ForegroundColor Green

# Time range: 09/04/2026 1:30 PM to 2:30 PM (60 minutes)
$startTime = Get-Date "2026-04-09 13:30:00"
$endTime = Get-Date "2026-04-09 14:30:00"
$totalMinutes = ($endTime - $startTime).TotalMinutes

# Shuffle files randomly
$shuffledFiles = $untrackedFiles | Sort-Object { Get-Random }

# Calculate time increment per file
$timeIncrement = $totalMinutes / $shuffledFiles.Count

Write-Host "`nStarting commit process..." -ForegroundColor Cyan
Write-Host "Time range: $($startTime.ToString('yyyy-MM-dd HH:mm:ss')) to $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
Write-Host "Total files: $($shuffledFiles.Count)" -ForegroundColor Yellow
Write-Host "Team members: $($teamMembers.Count)" -ForegroundColor Yellow
Write-Host ""

$currentTime = $startTime
$commitCount = 0

foreach ($file in $shuffledFiles) {
    # Select random team member
    $member = $teamMembers | Get-Random
    
    # Format commit date
    $commitDate = $currentTime.ToString("yyyy-MM-dd HH:mm:ss")
    
    # Stage the file
    git add $file
    
    # Create commit message
    $commitMessage = "Add $file"
    
    # Set git author and committer
    $env:GIT_AUTHOR_NAME = $member.name
    $env:GIT_AUTHOR_EMAIL = $member.email
    $env:GIT_COMMITTER_NAME = $member.name
    $env:GIT_COMMITTER_EMAIL = $member.email
    $env:GIT_AUTHOR_DATE = $commitDate
    $env:GIT_COMMITTER_DATE = $commitDate
    
    # Commit the file
    git commit -m $commitMessage --date="$commitDate" 2>&1 | Out-Null
    
    $commitCount++
    
    # Progress indicator
    if ($commitCount % 10 -eq 0 -or $commitCount -eq $shuffledFiles.Count) {
        $progress = [math]::Round(($commitCount / $shuffledFiles.Count) * 100, 1)
        Write-Host "Progress: $commitCount/$($shuffledFiles.Count) files ($progress%) - Latest: $($member.name) at $($currentTime.ToString('HH:mm:ss'))" -ForegroundColor Green
    }
    
    # Increment time
    $currentTime = $currentTime.AddMinutes($timeIncrement)
}

# Clear environment variables
Remove-Item Env:GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Commit History Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total commits: $commitCount" -ForegroundColor Yellow
Write-Host "Time range: $($startTime.ToString('HH:mm:ss')) to $($currentTime.AddMinutes(-$timeIncrement).ToString('HH:mm:ss'))" -ForegroundColor Yellow
Write-Host ""
Write-Host "Team member contributions:" -ForegroundColor Cyan

foreach ($member in $teamMembers) {
    $memberCommits = git log --author="$($member.email)" --oneline --since="2026-04-09 13:30:00" --until="2026-04-09 14:30:00" | Measure-Object
    Write-Host "  $($member.name): $($memberCommits.Count) commits" -ForegroundColor White
}

Write-Host "`nTo view the commit history, run:" -ForegroundColor Cyan
Write-Host "  git log --oneline --since='2026-04-09 13:30:00' --until='2026-04-09 14:30:00'" -ForegroundColor Yellow
Write-Host "`nTo push to remote, run:" -ForegroundColor Cyan
Write-Host "  git push origin main" -ForegroundColor Yellow
