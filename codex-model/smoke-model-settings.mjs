// Explicit synthetic live probes: ephemeral sessions, no Aura history commits,
// no MCP tools and no UE writes. Uses the existing signed-in Codex CLI.
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const target = process.argv[2] || 'http://127.0.0.1:41777/chat2';
const endpoint = new URL(target);
if (endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)
    || endpoint.username || endpoint.password) throw new Error('Use the local Aura router endpoint.');
const rows = [];
const checkFast = process.argv.includes('--fast');
for (const [model, reasoning, fast] of [['gpt-6.1-sol', 'low', checkFast], ['gpt-6-astra', 'high', false]]) {
  const start = Date.now();
  const response = await fetch(target, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-aura-probe': '1' },
    body: JSON.stringify({ model: 'Codex', codexModel: model, codexReasoning: reasoning, codexFast: fast,
      mode: 'analyze', activeTool: false, creationKey: 'model-probe-' + randomUUID(), turnId: randomUUID(),
      messages: [{ role: 'user', id: randomUUID(), parts: [{ type: 'text', text: 'Reply exactly CODEX_MODEL_OK. Do not call any tools.' }] }],
    }), signal: AbortSignal.timeout(120_000),
  });
  const stream = await response.text();
  const frames = stream.split(/\r?\n/).filter(line => line.startsWith('data: ') && line !== 'data: [DONE]').map(line => JSON.parse(line.slice(6)));
  const answer = frames.filter(frame => frame.type === 'text-delta').map(frame => frame.delta).join('').trim();
  const selection = frames.find(frame => frame.type === 'data-aura-codex-selection')?.data;
  const noCloudCommit = !frames.some(frame => frame.type === 'data-aura-commit');
  const ok = response.ok && answer === 'CODEX_MODEL_OK' && selection?.model === model
    && selection?.reasoning === reasoning && selection?.fast === fast
    && selection?.serviceTier === (fast ? 'fast' : 'default') && noCloudCommit && stream.includes('data: [DONE]')
    && frames.some(frame => frame.type === 'finish' && frame.finishReason === 'stop');
  rows.push({ model, reasoning, fast, ok, httpStatus: response.status, elapsedMs: Date.now() - start,
    answer, selection, noCloudCommit });
  process.stdout.write(JSON.stringify(rows.at(-1)) + '\n');
}
if (process.argv[3]) {
  const output = path.resolve(process.argv[3]);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify({ ok: rows.every(row => row.ok), rows }, null, 2) + '\n');
}
if (!rows.every(row => row.ok)) process.exitCode = 1;
