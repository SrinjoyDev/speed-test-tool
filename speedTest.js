#!/usr/bin/env node
import fetch from "node-fetch";
import chalk from "chalk";
import { performance } from "perf_hooks";
import cliProgress from "cli-progress";
import { pipeline } from "stream";
import { Writable } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

const DOWNLOAD_URL = "https://proof.ovh.net/files/10Mb.dat"; // ✅ working test file
const UPLOAD_URL = "https://postman-echo.com/post";

function bitsToMbps(bits, seconds) {
  return (bits / seconds / 1024 / 1024).toFixed(2);
}

async function testPing(url) {
  const samples = 5;
  const times = [];

  console.log(chalk.blue("\n📡 Testing Ping..."));

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    await fetch(url);
    const duration = performance.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((a, b) => a + b, 0) / samples;
  console.log(chalk.green(`🏓 Average Ping: ${avg.toFixed(2)} ms`));
  return avg;
}

async function testDownload() {
  console.log(chalk.blue("\n📥 Testing Download Speed..."));

  const bar = new cliProgress.SingleBar(
    { format: "Downloading [{bar}] {percentage}% | {speed} Mbps" },
    cliProgress.Presets.shades_classic
  );

  const res = await fetch(DOWNLOAD_URL);
  const contentLength = res.headers.get("content-length")
    ? parseInt(res.headers.get("content-length"))
    : 10 * 1024 * 1024;

  bar.start(100, 0, { speed: "0.00" });
  const start = performance.now();
  let bytes = 0;

  await streamPipeline(
    res.body,
    new Writable({
      write(chunk, _, cb) {
        bytes += chunk.length;
        const percent = Math.min((bytes / contentLength) * 100, 100);
        const elapsed = (performance.now() - start) / 1000;
        const speed = bitsToMbps(bytes * 8, elapsed);
        bar.update(percent, { speed });
        cb();
      },
    })
  );

  bar.stop();
  const duration = (performance.now() - start) / 1000;
  const speedMbps = bitsToMbps(bytes * 8, duration);
  console.log(chalk.green(`✅ Download Speed: ${speedMbps} Mbps`));
  return speedMbps;
}

async function testUpload() {
  console.log(chalk.blue("\n📤 Testing Upload Speed..."));
  const bar = new cliProgress.SingleBar(
    { format: "Uploading [{bar}] {percentage}% | {speed} Mbps" },
    cliProgress.Presets.shades_classic
  );
  bar.start(100, 0, { speed: "0.00" });

  const dataSizeMB = 2;
  const totalSize = dataSizeMB * 1024 * 1024;
  const data = Buffer.alloc(totalSize, "x");

  const start = performance.now();
  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: data,
    headers: { "Content-Length": totalSize },
  });

  await res.text(); // read response fully
  const duration = (performance.now() - start) / 1000;
  const speedMbps = bitsToMbps(totalSize * 8, duration);

  bar.update(100, { speed: speedMbps });
  bar.stop();
  console.log(chalk.green(`✅ Upload Speed: ${speedMbps} Mbps`));
  return speedMbps;
}

async function run() {
  console.log(chalk.cyan.bold("\n🌐 Internet Speed Test CLI\n"));

  const ping = await testPing("https://google.com");
  const download = await testDownload();
  const upload = await testUpload();

  console.log(chalk.yellow("\n📊 Final Results:"));
  console.log(chalk.white("-------------------------"));
  console.log(chalk.white(`Ping: ${ping.toFixed(2)} ms`));
  console.log(chalk.white(`Download: ${download} Mbps`));
  console.log(chalk.white(`Upload: ${upload} Mbps`));
  console.log(chalk.white("-------------------------\n"));
}

run();

