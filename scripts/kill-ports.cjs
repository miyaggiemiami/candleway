const { execSync } = require("child_process");
const ports = [5000, 5173];
for (const port of ports) {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: "ignore" });
  } catch {}
}
console.log("Ports cleared.");
