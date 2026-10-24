import { Router } from "express";
import { spawn } from "node:child_process";
import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import path from "node:path";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { userCollection, userDocument } from "../firestore";

const router = Router();

router.use(requireAuth);

type Mt5Action = "get-account-info" | "get-positions" | "execute-trade" | "close-position";
type Mt5Result = Record<string, unknown>;

let queuedRequest = Promise.resolve();

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getCredentialsEncryptionKey() {
  const value = process.env.MT5_CREDENTIALS_ENCRYPTION_KEY;
  if (!value || !/^[\da-f]{64}$/i.test(value)) {
    throw new Error("MT5_CREDENTIALS_ENCRYPTION_KEY must be set to a 64-character hexadecimal key.");
  }
  return Buffer.from(value, "hex");
}

function encryptPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCredentialsEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptPassword(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Saved MT5 password has an unsupported encrypted format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getCredentialsEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function serializeMt5Request(payload: Record<string, unknown>): Promise<Mt5Result> {
  const request = queuedRequest.then(() => new Promise<Mt5Result>((resolve, reject) => {
    const python = process.env.MT5_PYTHON_PATH || "python";
    const scriptPath = path.resolve(process.cwd(), "scripts", "metatrader_connector.py");
    const child = spawn(python, [scriptPath], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", (error) => reject(new Error(`Could not start the local MT5 connector: ${error.message}`)));
    child.once("close", (code) => {
      let result: Mt5Result;
      try {
        result = JSON.parse(stdout);
      } catch {
        reject(new Error(stderr.trim() || `The MT5 connector returned invalid output (exit code ${code}).`));
        return;
      }
      if (code !== 0 || result.error) {
        const connectorError = typeof result.error === "string" ? result.error : undefined;
        reject(new Error(connectorError || stderr.trim() || `MT5 connector exited with code ${code}.`));
        return;
      }
      resolve(result);
    });
    child.stdin.end(JSON.stringify(payload));
  }));
  queuedRequest = request.then(() => undefined, () => undefined);
  return request;
}

async function loadCredentials(userId: string) {
  const snapshot = await userDocument(userId, "metatraderSettings", "default").get();
  const settings = snapshot.data();
  if (!settings?.mt5_login || !settings.mt5_server || !settings.mt5_password_encrypted) {
    throw new Error("MT5 is not configured. Add your account number, trading password, and broker server in Settings.");
  }
  return {
    settings,
    login: settings.mt5_login,
    password: decryptPassword(settings.mt5_password_encrypted),
    server: settings.mt5_server,
  };
}

router.get("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await userDocument(req.userId!, "metatraderSettings", "default").get();
    if (!snapshot.exists) return res.json(null);
    const settings = snapshot.data()!;
    return res.json({
      login: settings.mt5_login,
      server: settings.mt5_server,
      has_password: Boolean(settings.mt5_password_encrypted),
      is_connected: settings.is_connected,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: getErrorMessage(err, "Could not load MT5 settings.") });
  }
});

router.post("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const { login, password, server, is_connected } = req.body;
    if (login !== undefined && (typeof login !== "string" || !/^\d+$/.test(login.trim()))) {
      return res.status(400).json({ error: "MT5 account number must contain digits only." });
    }
    if (server !== undefined && (typeof server !== "string" || !server.trim())) {
      return res.status(400).json({ error: "Enter the exact broker server name." });
    }
    if (password !== undefined && typeof password !== "string") {
      return res.status(400).json({ error: "MT5 password must be text." });
    }
    if (is_connected !== undefined && typeof is_connected !== "boolean") {
      return res.status(400).json({ error: "Connection status must be a boolean." });
    }

    const ref = userDocument(req.userId!, "metatraderSettings", "default");
    const snapshot = await ref.get();
    const existing = snapshot.data();
    const credentialsChanged = login !== undefined || server !== undefined || Boolean(password);
    await ref.set({
      user_id: req.userId!,
      mt5_login: login?.trim() || existing?.mt5_login || "",
      mt5_server: server?.trim() || existing?.mt5_server || "",
      mt5_password_encrypted: password ? encryptPassword(password) : existing?.mt5_password_encrypted || "",
      is_connected: is_connected !== undefined ? is_connected : credentialsChanged ? false : existing?.is_connected || false,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    const settings = (await ref.get()).data()!;
    return res.json({
      login: settings.mt5_login,
      server: settings.mt5_server,
      has_password: Boolean(settings.mt5_password_encrypted),
      is_connected: settings.is_connected,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: getErrorMessage(err, "Could not save MT5 settings.") });
  }
});

router.post("/trade", async (req: AuthenticatedRequest, res) => {
  const action = req.body?.action as Mt5Action | undefined;
  try {
    const allowedActions: Mt5Action[] = ["get-account-info", "get-positions", "execute-trade", "close-position"];
    if (!action || !allowedActions.includes(action)) {
      return res.status(400).json({ error: "Invalid MetaTrader action." });
    }

    const { settings, ...credentials } = await loadCredentials(req.userId!);
    const connectorPayload: Record<string, unknown> = { action, ...credentials };

    if (action === "execute-trade") {
      const { symbol, volume, stopLoss, takeProfit, direction } = req.body;
      if (typeof symbol !== "string" || !symbol.trim() || !["BUY", "SELL"].includes(direction) ||
          typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0) {
        return res.status(400).json({ error: "Provide a symbol, BUY or SELL direction, and a positive trade volume." });
      }
      Object.assign(connectorPayload, { symbol, volume, stopLoss, takeProfit, direction });
    }
    if (action === "close-position") {
      const positionId = req.body?.tradeId;
      if (typeof positionId !== "string" || !/^\d+$/.test(positionId)) {
        return res.status(400).json({ error: "Provide a valid position ticket to close." });
      }
      connectorPayload.positionId = positionId;
    }

    const result = await serializeMt5Request(connectorPayload);
    await userDocument(req.userId!, "metatraderSettings", "default").set({
      is_connected: true,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    if (action === "execute-trade") {
      const trade = {
        user_id: req.userId!,
        pair: req.body.symbol,
        direction: req.body.direction,
        entry_price: String(result.price),
        stop_loss: String(req.body.stopLoss || 0),
        take_profit: String(req.body.takeProfit || 0),
        lot_size: String(req.body.volume),
        status: "open",
        outcome: "pending",
        pnl: "0",
        execution_mode: "live",
        notes: `MT5 order: ${result.orderId || "market"}`,
        opened_at: new Date().toISOString(),
      };
      await userCollection(req.userId!, "trades").add(trade);
      return res.json(result);
    }

    return res.json(result);
  } catch (err: unknown) {
    console.error("MetaTrader route error:", err);
    if (action) {
      await userDocument(req.userId!, "metatraderSettings", "default")
        .set({ is_connected: false, updated_at: new Date().toISOString() }, { merge: true })
        .catch((updateError) => console.error("Could not update MT5 connection state:", updateError));
    }
    return res.status(500).json({ error: getErrorMessage(err, "Internal error") });
  }
});

export default router;
