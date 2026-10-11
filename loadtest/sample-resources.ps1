# Samples CPU and memory every few seconds while a k6 run is going, so we can tell
# whether the backend, MySQL, or k6 itself is the one running out of room.
# Started and stopped by run.sh; it exits once $StopFile appears.
#
# All CPU numbers are a share of the whole machine (100 = every core busy).

param(
    [Parameter(Mandatory)][string]$OutFile,
    [Parameter(Mandatory)][string]$StopFile,
    [int]$IntervalSec = 5
)

$cores = [Environment]::ProcessorCount

# The backend is whatever is listening on 8080 (not the Maven wrapper around it)
$javaPid = (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1).OwningProcess

# docker stats gives CPU per core (up to 1200% here) and memory like "512MiB / 7.7GiB"
function Get-ContainerStats([string]$name) {
    $line = docker stats --no-stream --format "{{.CPUPerc}};{{.MemUsage}}" $name 2>$null
    if (-not $line) { return @('', '') }
    $cpu, $mem = $line -split ';'
    $cpuPct = [math]::Round([double]($cpu.TrimEnd('%')) / $cores, 1)
    $memMb = ''
    if ($mem -match '^([\d.]+)(KiB|MiB|GiB)') {
        $factor = @{ KiB = 1 / 1024; MiB = 1; GiB = 1024 }[$Matches[2]]
        $memMb = [math]::Round([double]$Matches[1] * $factor)
    }
    return @($cpuPct, $memMb)
}

Set-Content -Path $OutFile -Encoding ascii -Value 'time,total_cpu,java_cpu,java_mem_mb,mysql_cpu,mysql_mem_mb,k6_cpu'

$prevCpuSec = $null
$prevTime = $null
while (-not (Test-Path $StopFile)) {
    $loopStart = Get-Date

    $total = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'").PercentProcessorTime

    # Process CPU time is cumulative, so take the difference since the last sample
    $javaCpu = ''
    $javaMem = ''
    $proc = if ($javaPid) { Get-Process -Id $javaPid -ErrorAction SilentlyContinue }
    if ($proc) {
        $now = Get-Date
        $cpuSec = $proc.TotalProcessorTime.TotalSeconds
        if ($null -ne $prevCpuSec) {
            $javaCpu = [math]::Round(($cpuSec - $prevCpuSec) / ($now - $prevTime).TotalSeconds / $cores * 100, 1)
        }
        $prevCpuSec = $cpuSec
        $prevTime = $now
        $javaMem = [math]::Round($proc.WorkingSet64 / 1MB)
    }

    $mysql = Get-ContainerStats 'jobflow-mysql-1'
    $k6 = Get-ContainerStats 'jobflow-k6'

    $time = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    Add-Content -Path $OutFile -Encoding ascii -Value "$time,$total,$javaCpu,$javaMem,$($mysql[0]),$($mysql[1]),$($k6[0])"

    $wait = $IntervalSec - ((Get-Date) - $loopStart).TotalSeconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]($wait * 1000)) }
}
