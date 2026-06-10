#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const net = require("node:net");

const host = process.env.MC_RCON_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.MC_RCON_PORT || "25575", 10);
const passwordFile = process.env.RCON_PASSWORD_FILE || "/root/server/.rcon-password";
const intervalHours = Number.parseFloat(process.env.RESTART_INTERVAL_HOURS || "4");
const warningMinutes = (process.env.RESTART_WARNINGS_MINUTES || "10,5,1")
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isFinite(value) && value > 0)
  .sort((a, b) => b - a);
const postStopDelayMs = Number.parseInt(process.env.POST_STOP_DELAY_SECONDS || "120", 10) * 1000;

const intervalMs = Math.round(intervalHours * 60 * 60 * 1000);
const maxWarningMs = Math.max(...warningMinutes) * 60 * 1000;

if (!Number.isFinite(intervalMs) || intervalMs <= maxWarningMs) {
  throw new Error("RESTART_INTERVAL_HOURS must be greater than the largest warning minute.");
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

async function sleepUntil(timestamp) {
  while (Date.now() < timestamp) {
    await sleep(Math.min(timestamp - Date.now(), 60_000));
  }
}

function readPassword() {
  if (process.env.MC_RCON_PASSWORD) {
    return process.env.MC_RCON_PASSWORD.trim();
  }

  return fs.readFileSync(passwordFile, "utf8").trim();
}

function encodePacket(id, type, body) {
  const bodyBuffer = Buffer.from(body, "utf8");
  const length = 4 + 4 + bodyBuffer.length + 2;
  const packet = Buffer.alloc(4 + length);

  packet.writeInt32LE(length, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  bodyBuffer.copy(packet, 12);
  packet.writeInt16LE(0, 12 + bodyBuffer.length);

  return packet;
}

function createPacketReader(socket) {
  let buffer = Buffer.alloc(0);
  const queued = [];
  const pending = [];

  function resolvePacket(packet) {
    const waiter = pending.shift();
    if (waiter) {
      waiter.resolve(packet);
    } else {
      queued.push(packet);
    }
  }

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const length = buffer.readInt32LE(0);
      if (buffer.length < 4 + length) {
        return;
      }

      const packetBuffer = buffer.subarray(4, 4 + length);
      buffer = buffer.subarray(4 + length);

      const id = packetBuffer.readInt32LE(0);
      const type = packetBuffer.readInt32LE(4);
      const body = packetBuffer.subarray(8, packetBuffer.length - 2).toString("utf8");
      resolvePacket({ id, type, body });
    }
  });

  socket.on("error", (error) => {
    while (pending.length) {
      pending.shift().reject(error);
    }
  });

  socket.on("close", () => {
    while (pending.length) {
      pending.shift().reject(new Error("RCON socket closed"));
    }
  });

  return function readPacket(timeoutMs = 10_000) {
    if (queued.length) {
      return Promise.resolve(queued.shift());
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for RCON response"));
      }, timeoutMs);

      pending.push({
        resolve: (packet) => {
          clearTimeout(timeout);
          resolve(packet);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  };
}

async function rconCommand(command) {
  const password = readPassword();

  if (!password) {
    throw new Error("RCON password is empty.");
  }

  const socket = net.createConnection({ host, port });
  const readPacket = createPacketReader(socket);

  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
    socket.setTimeout(10_000, () => reject(new Error("RCON connection timeout")));
  });

  socket.write(encodePacket(1, 3, password));
  const auth = await readPacket();

  if (auth.id === -1) {
    socket.end();
    throw new Error("RCON authentication failed.");
  }

  socket.write(encodePacket(2, 2, command));
  const response = await readPacket();
  socket.end();
  return response.body;
}

async function commandWithRetry(command, attempts, delayMs) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await rconCommand(command);
    } catch (error) {
      lastError = error;
      log(`RCON attempt ${attempt}/${attempts} failed: ${error.message}`);
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

function minuteWord(minutes) {
  if (minutes % 10 === 1 && minutes % 100 !== 11) {
    return "минуту";
  }

  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) {
    return "минуты";
  }

  return "минут";
}

function tellrawWarning(minutes) {
  const critical = minutes <= 1;
  const payload = [
    { text: "[FOGBOUND] ", color: "dark_purple", bold: true },
    { text: "Перезапуск сервера через ", color: "gold" },
    { text: `${minutes} ${minuteWord(minutes)}`, color: critical ? "red" : "yellow", bold: true },
    { text: ". ", color: "gold" },
    { text: "Найдите безопасное место и не начинайте боссов.", color: "aqua" }
  ];

  return `tellraw @a ${JSON.stringify(payload)}`;
}

function tellrawRestartNow() {
  const payload = [
    { text: "[FOGBOUND] ", color: "dark_purple", bold: true },
    { text: "Сервер перезапускается. ", color: "red", bold: true },
    { text: "Возвращайтесь через пару минут.", color: "green" }
  ];

  return `tellraw @a ${JSON.stringify(payload)}`;
}

async function sendWarning(minutes) {
  log(`Sending ${minutes} minute restart warning.`);
  try {
    await commandWithRetry(tellrawWarning(minutes), 3, 5_000);
  } catch (error) {
    log(`Warning ${minutes} min was not delivered: ${error.message}`);
  }
}

async function stopServer() {
  log("Saving world before scheduled restart.");
  await commandWithRetry(tellrawRestartNow(), 3, 5_000);
  await commandWithRetry("save-all flush", 3, 10_000);
  await sleep(5_000);
  log("Stopping Minecraft server. PM2 should start it again.");
  await commandWithRetry("stop", 12, 5_000);
}

async function runCycle() {
  const restartAt = Date.now() + intervalMs;
  log(`Next scheduled restart: ${new Date(restartAt).toISOString()}`);

  for (const minutes of warningMinutes) {
    await sleepUntil(restartAt - minutes * 60_000);
    await sendWarning(minutes);
  }

  await sleepUntil(restartAt);
  await stopServer();
  log(`Waiting ${Math.round(postStopDelayMs / 1000)} seconds before scheduling the next cycle.`);
  await sleep(postStopDelayMs);
}

async function main() {
  readPassword();
  log(`Restart scheduler started. Interval: ${intervalHours}h. Warnings: ${warningMinutes.join(", ")} min.`);

  while (true) {
    try {
      await runCycle();
    } catch (error) {
      log(`Cycle failed: ${error.stack || error.message}`);
      await sleep(60_000);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
