const { execFileSync } = require("child_process");
const ports = [5000, 5173];

if (process.platform === "win32") {
  const portList = ports.join(",");
  const command = [
    `$ports = @(${portList})`,
    "$owners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object -ExpandProperty OwningProcess -Unique",
    "$owners | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction Stop }",
  ].join("; ");

  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    stdio: "inherit",
  });
} else {
  for (const port of ports) {
    try {
      execFileSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
    } catch (error) {
      if (error.status !== 1) throw error;
    }
  }
}

console.log("Ports cleared.");
