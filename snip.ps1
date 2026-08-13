$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $ScriptDir "cli.js") @args
