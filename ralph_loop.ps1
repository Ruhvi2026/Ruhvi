<#
.SYNOPSIS
    Ralph Loop Automation Runner for Windows PowerShell.
.DESCRIPTION
    Autonomous goal-oriented execution and recovery loop.
    Enforces retry limits, automated failure recovery, and checkpoint persistence.
.EXAMPLE
    .\ralph_loop.ps1 run
    .\ralph_loop.ps1 run -CustomCommand "npx tsc --noEmit" -MaxRetries 15
    .\ralph_loop.ps1 status
    .\ralph_loop.ps1 stop
    .\ralph_loop.ps1 reset
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet("run", "status", "step", "stop", "reset")]
    [string]$Action = "run",

    [Parameter(Position = 1)]
    [string]$CustomCommand = "",

    [Parameter(Position = 2)]
    [int]$MaxRetries = 0
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineScript = Join-Path $ScriptDir "scripts\ralph-engine.mjs"

if (-not (Test-Path $EngineScript)) {
    Write-Error "Ralph engine script not found at $EngineScript"
    exit 1
}

$NodeArgs = @($EngineScript, $Action)
if ($CustomCommand -ne "") {
    $NodeArgs += "--cmd"
    $NodeArgs += $CustomCommand
}
if ($MaxRetries -gt 0) {
    $NodeArgs += "--max-retries"
    $NodeArgs += $MaxRetries
}

Write-Host ">>> [Ralph Loop] Invoking: node scripts/ralph-engine.mjs $Action" -ForegroundColor Magenta
& node $NodeArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> [Ralph Loop] Exited with status: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
} else {
    Write-Host ">>> [Ralph Loop] Execution completed successfully." -ForegroundColor Green
}
