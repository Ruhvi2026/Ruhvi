<#
.SYNOPSIS
    GSD (Get Shit Done) Automation Runner for Windows PowerShell.
.DESCRIPTION
    Automates task planning, execution tracking, and verification checks.
    Enforces strict 3-state transition: PLAN -> EXECUTE -> VERIFY.
.EXAMPLE
    .\gsd_runner.ps1 status
    .\gsd_runner.ps1 plan TASK-001 "Bootstrap Setup"
    .\gsd_runner.ps1 execute TASK-001
    .\gsd_runner.ps1 verify TASK-001
    .\gsd_runner.ps1 summarize
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet("status", "plan", "execute", "verify", "summarize", "init")]
    [string]$Action = "status",

    [Parameter(Position = 1)]
    [string]$TaskId = "",

    [Parameter(Position = 2)]
    [string]$ExtraArg = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineScript = Join-Path $ScriptDir "scripts\gsd-engine.mjs"

if (-not (Test-Path $EngineScript)) {
    Write-Error "GSD engine script not found at $EngineScript"
    exit 1
}

# Ensure node is accessible
try {
    $null = Get-Command node -ErrorAction Stop
} catch {
    Write-Error "Node.js runtime not found in PATH."
    exit 1
}

# Construct arguments
$NodeArgs = @($EngineScript, $Action)
if ($TaskId -ne "") {
    $NodeArgs += $TaskId
}
if ($ExtraArg -ne "") {
    $NodeArgs += $ExtraArg
}

Write-Host ">>> [GSD Runner] Invoking: node scripts/gsd-engine.mjs $Action $TaskId $ExtraArg" -ForegroundColor Cyan

# Execute Node Engine
& node $NodeArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> [GSD Runner] Exited with failure code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
} else {
    Write-Host ">>> [GSD Runner] Finished successfully." -ForegroundColor Green
}

