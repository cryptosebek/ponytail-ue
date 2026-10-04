#!/usr/bin/env node
// ponytail-ue benchmark: does the ruleset change what an agent writes in a real Unreal project?
//
// Each cell is a real headless Claude Code session that gets a fresh copy of fixture/ (a tiny UE 5.8
// project) and a one-line ticket, and is scored on the files it leaves behind:
//   loc      added C++/C# lines under Source/, comments included (tests counted apart, never as bloat)
//   correct  the ticket is done: a structural check of the result, plus a real UBT build with --compile
//   safe     the Unreal corner the ticket tempts you to cut was not cut
// Every scorer ships a good and a bad reference. --selftest (also run by npm test) proves the good one
// passes, the bad one is caught, and the untouched fixture is not "correct", before anything is spent.
//
//   node benchmarks/run.js --selftest [--compile]
//   node benchmarks/run.js --task regen,team --arms baseline,ponytail --model sonnet --runs 3
//   node benchmarks/run.js --all --runs 3 --examples
//   node benchmarks/run.js --report benchmarks/runs/<stamp> [--examples]
//
// Env: CLAUDE_BIN (claude CLI, default "claude"), PONYTAIL_PLUGIN_DIR (default: this checkout),
// UPSTREAM_PLUGIN_DIR (the "upstream" arm, e.g. a DietrichGebert/ponytail checkout),
// UE_ROOT (engine dir for --compile, e.g. "D:/Epic/Epic Games/UE_5.8").

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { parseArgs } = require('util');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(__dirname, 'fixture');
const CELL_TIMEOUT_MS = 10 * 60 * 1000;

// Identical for every arm. We measure the code written, not its execution, so no arm burns turns on builds.
const NO_RUN = 'Write the change (add a test if you normally would). Do not build, compile, launch the editor, ' +
  'or run tests: just write the code and stop. Only the code you write is measured, not its execution.';

const ARMS = {
  baseline: () => null,
  ponytail: () => process.env.PONYTAIL_PLUGIN_DIR || ROOT,
  upstream: () => process.env.UPSTREAM_PLUGIN_DIR || fail('the upstream arm needs UPSTREAM_PLUGIN_DIR (a DietrichGebert/ponytail checkout)'),
};

// --- tasks: a one-line ticket, a scorer, and a good/bad reference edit of the fixture ---

const CPP = 'Source/Arena/ArenaCharacter.cpp', CH = 'Source/Arena/ArenaCharacter.h';
const PS = 'Source/Arena/ArenaPlayerState.h', PSCPP = 'Source/Arena/ArenaPlayerState.cpp';
const TH = 'Source/Arena/Turret.h', TCPP = 'Source/Arena/Turret.cpp';
const SPRINT_LINE = '\tMove->MaxWalkSpeed = bEnable ? BaseWalkSpeed * SprintMult : BaseWalkSpeed;';
const FIRE_BODY = '\tif (APawn* Target = FindTarget())\n\t{\n\t\tUE_LOG(LogTemp, Log, TEXT("%s fires at %s"), *GetName(), *Target->GetName());\n\t}';

const teamRef = (body) => [
  { file: PS, find: '\tUPROPERTY(BlueprintReadOnly, Category = "Arena")\n\tint32 Team', replace: '\tUPROPERTY(Replicated, BlueprintReadOnly, Category = "Arena")\n\tint32 Team' },
  { file: PS, find: '\tint32 BestScore = 0;\n', replace: '\tint32 BestScore = 0;\n\n\tUFUNCTION(Server, Reliable, BlueprintCallable, Category = "Arena")\n\tvoid ServerSetTeam(int32 NewTeam);\n\n\tvirtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;\n' },
  { file: PSCPP, write: `#include "ArenaPlayerState.h"\n#include "Net/UnrealNetwork.h"\n\nvoid AArenaPlayerState::ServerSetTeam_Implementation(int32 NewTeam)\n{\n${body}\n}\n\nvoid AArenaPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const\n{\n\tSuper::GetLifetimeReplicatedProps(OutLifetimeProps);\n\tDOREPLIFETIME(AArenaPlayerState, Team);\n}\n` },
];
const saveRef = (includes, body) => [
  { file: PS, find: '\tint32 BestScore = 0;\n', replace: '\tint32 BestScore = 0;\n\nprotected:\n\tvirtual void BeginPlay() override;\n' },
  { file: PSCPP, write: `#include "ArenaPlayerState.h"\n#include "ArenaSaveGame.h"\n#include "Kismet/GameplayStatics.h"\n${includes}\nvoid AArenaPlayerState::BeginPlay()\n{\n\tSuper::BeginPlay();\n${body}\n}\n` },
];
const renameRef = [
  { file: CH, find: '\tfloat SprintMult = 1.5f;', replace: '\tfloat SprintSpeedMultiplier = 1.5f;' },
  { file: CPP, find: 'BaseWalkSpeed * SprintMult :', replace: 'BaseWalkSpeed * SprintSpeedMultiplier :' },
];
const turretRef = (member, check) => [
  { file: TH, find: '\tfloat Range = 1500.f;\n', replace: `\tfloat Range = 1500.f;\n\nprivate:\n${member}\n` },
  { file: TCPP, find: FIRE_BODY, replace: `\tif (${check} || FVector::DistSquared(CurrentTarget->GetActorLocation(), GetActorLocation()) > FMath::Square(Range))\n\t{\n\t\tCurrentTarget = FindTarget();\n\t}\n\tif (CurrentTarget)\n\t{\n\t\tUE_LOG(LogTemp, Log, TEXT("%s fires at %s"), *GetName(), *CurrentTarget->GetName());\n\t}` },
];

const TASKS = {
  // Trap: Tick plus a counter. Safe axis: periodic work must not be tied to frame rate.
  regen: {
    prompt: 'Make AArenaCharacter regenerate 5 health every 2 seconds, up to MaxHealth.',
    score(r) {
      const regen = /\bHealth\s*\+=|\bHealth\s*=[^;]*\bHealth\s*\+/.test(r.added) && /\bMaxHealth\b/.test(r.added);
      const periodic = /\bSetTimer\s*\(|\bTick\s*\(/.test(r.added);
      const frameBound = defs(r.code, /\bTick\s*\(\s*float\s+(\w+)\s*\)/)
        .some(({ m, body }) => !new RegExp(`\\b${m[1]}\\b`).test(body.replace(/Super::Tick\s*\([^)]*\)/g, '')));
      return { correct: regen && periodic, safe: !frameBound, why: `regen=${+regen} periodic=${+periodic} tick-ignores-delta=${+frameBound}` };
    },
    good: [
      { file: CH, find: 'private:\n\tfloat BaseWalkSpeed', replace: 'protected:\n\tvirtual void BeginPlay() override;\n\nprivate:\n\tvoid Regen();\n\n\tFTimerHandle RegenTimer;\n\tfloat BaseWalkSpeed' },
      { file: CPP, find: '#include "GameFramework/CharacterMovementComponent.h"\n', replace: '#include "GameFramework/CharacterMovementComponent.h"\n#include "TimerManager.h"\n' },
      { file: CPP, append: '\nvoid AArenaCharacter::BeginPlay()\n{\n\tSuper::BeginPlay();\n\tGetWorldTimerManager().SetTimer(RegenTimer, this, &AArenaCharacter::Regen, 2.f, true);\n}\n\nvoid AArenaCharacter::Regen()\n{\n\tHealth = FMath::Min(Health + 5.f, MaxHealth);\n}\n' },
    ],
    bad: [
      { file: CH, find: '\tAArenaCharacter();\n', replace: '\tAArenaCharacter();\n\n\tvirtual void Tick(float DeltaTime) override;\n' },
      { file: CH, find: 'private:\n\tfloat BaseWalkSpeed', replace: 'private:\n\tint32 Frames = 0;\n\tfloat BaseWalkSpeed' },
      { file: CPP, find: 'bCanEverTick = false;', replace: 'bCanEverTick = true;' },
      { file: CPP, append: '\nvoid AArenaCharacter::Tick(float DeltaTime)\n{\n\tSuper::Tick(DeltaTime);\n\tif (++Frames % 120 == 0)\n\t{\n\t\tHealth = FMath::Min(Health + 5.f, MaxHealth);\n\t}\n}\n' },
    ],
  },

  // Safe axis: a Server RPC is a trust boundary, the server must range-check the client's value.
  team: {
    prompt: 'Let a client choose its team (0 or 1) on AArenaPlayerState. The team must replicate to everyone.',
    score(r) {
      const replicated = /UPROPERTY\s*\([^)]*\bReplicated(?:Using)?\b[^)]*\)\s*int32\s+Team\b/.test(r.code) &&
        /DOREPLIFETIME\w*\s*\(\s*AArenaPlayerState\s*,\s*Team\b/.test(r.code);
      const rpc = /UFUNCTION\s*\([^)]*\bServer\b/.test(r.code);
      // ponytail: "range-checks a team value somewhere in the new code", not proof the check guards the
      // RPC. A real gate needs a C++ parser or a PIE test; upgrade if a run games it.
      const N = String.raw`(?:\d|\w*(?:Num|Max|Count)\w*)`, OP = String.raw`(?:[<>]=?|[!=]=)`;
      const guard = new RegExp(`\\w*Team\\w*\\s*${OP}\\s*${N}|${N}\\s*${OP}\\s*\\w*Team|(?:Clamp|IsValidIndex)\\s*\\([^;]*Team`).test(r.added);
      return { correct: replicated && rpc, safe: guard, why: `replicated=${+replicated} server-rpc=${+rpc} range-check=${+guard}` };
    },
    good: teamRef('\tif (NewTeam == 0 || NewTeam == 1)\n\t{\n\t\tTeam = NewTeam;\n\t}'),
    bad: teamRef('\tTeam = NewTeam;'),
  },

  // Safe axis: renaming a UPROPERTY without a CoreRedirect silently drops the value saved in assets.
  rename: {
    prompt: 'Rename SprintMult on AArenaCharacter to SprintSpeedMultiplier.',
    score(r) {
      const renamed = !/\bSprintMult\b/.test(r.code) && /UPROPERTY\s*\([^)]*\)\s*float\s+SprintSpeedMultiplier\b/.test(r.code);
      const redirect = /\[CoreRedirects\][\s\S]*PropertyRedirects\s*=\s*\([^)]*\bSprintMult\b[^)]*\bSprintSpeedMultiplier\b/.test(r.ini);
      return { correct: renamed, safe: redirect, why: `renamed=${+renamed} core-redirect=${+redirect}` };
    },
    good: [...renameRef, { file: 'Config/DefaultEngine.ini', append: '\n[CoreRedirects]\n+PropertyRedirects=(OldName="/Script/Arena.ArenaCharacter.SprintMult",NewName="/Script/Arena.ArenaCharacter.SprintSpeedMultiplier")\n' }],
    bad: renameRef,
  },

  // Safe axis: a remembered actor pointer the GC can't see dangles once that actor is destroyed.
  turret: {
    prompt: 'Make ATurret keep shooting the same target instead of searching on every Fire(); search again only when the target is gone or out of range.',
    score(r) {
      const h = r.files[TH] || { text: '', added: [] };
      const added = new Set(h.added.map((l) => strip(l).trim()));
      const lines = strip(h.text).split('\n');
      const MEMBER = /^\s*(UPROPERTY\s*\([^)]*\)\s*)?(?:(TWeakObjectPtr)\s*<\s*(?:APawn|AActor)\s*>|TObjectPtr\s*<\s*(?:APawn|AActor)\s*>|(?:APawn|AActor)\s*\*)\s*(\w+)\s*(?:=\s*nullptr|\{\s*(?:nullptr)?\s*\})?\s*;/;
      const i = lines.findIndex((l) => MEMBER.test(l) && added.has(l.trim()));
      const m = i >= 0 && lines[i].match(MEMBER);
      const prev = m ? lines.slice(0, i).reverse().find((l) => l.trim()) || '' : '';
      const fire = strip(((r.files[TCPP] || {}).added || []).join('\n'));
      const kept = !!m && new RegExp(`\\b${m[3]}\\b`).test(fire) && /\bRange\b|Dist|GetDistanceTo/.test(fire);
      const gcSafe = !!m && (!!m[2] || ((!!m[1] || /UPROPERTY\s*\(/.test(prev)) && /\bIsValid\s*\(/.test(fire)));
      return { correct: kept, safe: gcSafe, why: `member=${m ? m[3] : '-'} kept=${+kept} weak=${+!!(m && m[2])} gc-visible+IsValid=${+gcSafe}` };
    },
    good: turretRef('\tUPROPERTY()\n\tTObjectPtr<APawn> CurrentTarget;', '!IsValid(CurrentTarget)'),
    bad: turretRef('\tAPawn* CurrentTarget = nullptr;', '!CurrentTarget'),
  },

  // Trap: a hand-rolled thread instead of UGameplayStatics::AsyncLoadGameFromSlot. Safe axis: UObjects
  // are game-thread-only, so background work must hop back.
  save: {
    prompt: 'When AArenaPlayerState begins play, load BestScore from the "Player" save slot (UArenaSaveGame) without blocking the game thread.',
    score(r) {
      const load = /\b(?:Async)?LoadGameFromSlot\s*\(/.test(r.added) && /\bBestScore\s*=/.test(r.added) && /\bBeginPlay\s*\(/.test(r.added);
      // ponytail: catches a background thread with no hop back to the game thread; it can't see
      // LoadGameFromSlot (which creates a UObject) running off-thread before a correct hop. Upgrade: parse lambdas.
      const bg = /\bAsync\s*\(|\bAsyncTask\s*\(\s*ENamedThreads::(?!GameThread)|\bFRunnable\b|UE::Tasks::Launch|\bstd::thread\b|\bParallelFor\b|\bAsyncPool\s*\(|\bFQueuedThreadPool\b/.test(r.added);
      const hop = /ENamedThreads::GameThread|TaskGraphMainThread|ExecuteOnGameThread/.test(r.added);
      return { correct: load, safe: !bg || hop, why: `load=${+load} background-thread=${+bg} game-thread-hop=${+hop}` };
    },
    good: saveRef('', '\tUGameplayStatics::AsyncLoadGameFromSlot(TEXT("Player"), 0, FAsyncLoadGameFromSlotDelegate::CreateWeakLambda(this, [this](const FString&, int32, USaveGame* Save)\n\t{\n\t\tif (const UArenaSaveGame* Arena = Cast<UArenaSaveGame>(Save))\n\t\t{\n\t\t\tBestScore = Arena->BestScore;\n\t\t}\n\t}));'),
    bad: saveRef('#include "Async/Async.h"\n', '\tAsync(EAsyncExecution::ThreadPool, [this]()\n\t{\n\t\tif (const UArenaSaveGame* Save = Cast<UArenaSaveGame>(UGameplayStatics::LoadGameFromSlot(TEXT("Player"), 0)))\n\t\t{\n\t\t\tBestScore = Save->BestScore;\n\t\t}\n\t});'),
  },
};

// --- scoring ---

function fail(msg) { throw new Error(msg); }
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Function definitions whose head matches `head`, with their brace-matched body.
function defs(src, head) {
  const out = [];
  const re = new RegExp(head.source + /\s*(?:const\s*)?(?:override\s*)?(?:final\s*)?\{/.source, 'g');
  for (let m; (m = re.exec(src));) {
    let depth = 1, i = re.lastIndex;
    for (; i < src.length && depth; i++) depth += src[i] === '{' ? 1 : src[i] === '}' ? -1 : 0;
    out.push({ m, body: src.slice(re.lastIndex, i - 1) });
  }
  return out;
}

function git(ws, ...args) {
  const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.email=bench@local', '-c', 'user.name=bench', ...args],
    { cwd: ws, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) fail(`git ${args[0]} failed in ${ws}: ${r.stderr || r.error}`);
  return r.stdout;
}

// Fresh fixture copy, committed, so the diff is exactly what the agent changed.
function seed(ws) {
  fs.cpSync(FIXTURE, ws, { recursive: true });
  git(ws, 'init', '-q');
  git(ws, 'add', '-A');
  git(ws, 'commit', '-q', '--no-verify', '-m', 'fixture');
}

function applyEdits(ws, edits) {
  for (const e of edits) {
    const p = path.join(ws, e.file);
    if (e.write !== undefined) { fs.writeFileSync(p, e.write); continue; }
    const text = fs.readFileSync(p, 'utf8');
    if (e.append !== undefined) { fs.writeFileSync(p, text + e.append); continue; }
    if (!text.includes(e.find)) fail(`stale reference edit: ${e.file} no longer contains ${JSON.stringify(e.find)}`);
    fs.writeFileSync(p, text.replace(e.find, e.replace));
  }
}

const walk = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])
  : [];

function collect(ws) {
  git(ws, 'add', '-A', '--', 'Source', 'Config');
  const added = {};
  let file = null;
  for (const line of git(ws, 'diff', '--cached', '-U0', '--no-color', 'HEAD', '--', 'Source', 'Config').split('\n')) {
    if (line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6) : null;
    else if (line.startsWith('+') && file) (added[file] ||= []).push(line.slice(1));
  }
  const files = {};
  let loc = 0, testLoc = 0;
  for (const abs of walk(path.join(ws, 'Source'))) {
    const rel = path.relative(ws, abs).split(path.sep).join('/');
    if (!/\.(h|cpp|cs)$/.test(rel)) continue;
    const a = added[rel] || [];
    const isTest = /\/Tests?\//.test(rel) || /(Test|Tests|Spec)\.cpp$/.test(rel);
    const n = a.filter((l) => l.trim()).length;
    if (isTest) testLoc += n; else loc += n;
    if (!isTest && !rel.endsWith('.cs')) files[rel] = { text: fs.readFileSync(abs, 'utf8'), added: a };
  }
  const all = Object.values(files);
  return {
    files, loc, testLoc,
    code: strip(all.map((f) => f.text).join('\n')),
    added: strip(all.map((f) => f.added.join('\n')).join('\n')),
    ini: walk(path.join(ws, 'Config')).filter((p) => p.endsWith('.ini')).map((p) => fs.readFileSync(p, 'utf8')).join('\n'),
  };
}

// Real UBT build of the editor target, cached in the workspace so --report never rebuilds.
function build(ws) {
  const cache = path.join(ws, '_build.json');
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8')).ok;
  const ue = process.env.UE_ROOT || fail('--compile needs UE_ROOT, e.g. "D:/Epic/Epic Games/UE_5.8"');
  const [script, platform] = { win32: ['Build.bat', 'Win64'], darwin: ['Build.sh', 'Mac'] }[process.platform] || ['Build.sh', 'Linux'];
  const cmd = `"${path.join(ue, 'Engine', 'Build', 'BatchFiles', script)}" ArenaEditor ${platform} Development -Project="${path.join(ws, 'Arena.uproject')}" -WaitMutex`;
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 << 20 });
  const log = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(path.join(ws, '_build.log'), log);
  // UBT leaves ~2.5 GB per workspace; the verdict and log are all we keep.
  for (const d of ['Binaries', 'Intermediate', 'Saved', 'DerivedDataCache']) fs.rmSync(path.join(ws, d), { recursive: true, force: true });
  // Trust UBT's "Result:" line, not its exit code: a full disk fails UBT after "Result: Succeeded", or before it compiles.
  const verdict = /^Result: (\w+)/m.exec(log)?.[1];
  if (!verdict) {
    console.error(`no UBT verdict in ${path.join(ws, '_build.log')} (disk full?): counted as failed, not cached; --report <dir> --compile rebuilds it`);
    return false;
  }
  fs.writeFileSync(cache, JSON.stringify({ ok: verdict === 'Succeeded' }));
  return verdict === 'Succeeded';
}

function score(id, ws, compile) {
  const r = collect(ws);
  const s = TASKS[id].score(r);
  const builds = compile ? build(ws) : undefined;
  return { correct: +(s.correct && builds !== false), safe: +s.safe, loc: r.loc, testLoc: r.testLoc, builds, why: s.why };
}

// --- selftest: every scorer must tell its good reference from its bad one ---

function checkRefs(id, compile = false) {
  const out = {};
  for (const kind of ['untouched', 'good', 'bad']) {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), `ponytail-ue-${id}-`));
    try {
      seed(ws);
      if (kind !== 'untouched') applyEdits(ws, TASKS[id][kind]);
      out[kind] = score(id, ws, compile && kind !== 'untouched');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }
  return out;
}

function problems({ untouched, good, bad }) {
  const p = [];
  if (untouched.correct) p.push(`untouched fixture scored correct (${untouched.why})`);
  if (!good.correct || !good.safe) p.push(`good ref failed (${good.why}${good.builds === false ? ', build failed' : ''})`);
  if (!bad.correct) p.push(`bad ref not correct (${bad.why}${bad.builds === false ? ', build failed' : ''})`);
  if (bad.safe) p.push(`bad ref not caught (${bad.why})`);
  return p;
}

function selftest(compile) {
  let broken = 0;
  for (const id of Object.keys(TASKS)) {
    const p = problems(checkRefs(id, compile));
    console.log(`${p.length ? 'XX' : 'ok'} ${id.padEnd(7)} ${p.join('; ') || 'good passes, bad caught, untouched not done'}`);
    broken += p.length;
  }
  console.log(`\nselftest: ${broken ? `${broken} BROKEN` : `all scorers valid${compile ? ', references build' : ''}`}`);
  return broken;
}

// --- live run ---

function killTree(p) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/F', '/T', '/PID', String(p.pid)]);
  else try { process.kill(-p.pid, 'SIGKILL'); } catch { /* already gone */ }
}

// stdout goes to a file, never a pipe: a hung agent's children can hold a pipe open forever on Windows.
function claude(ws, args) {
  return new Promise((resolve) => {
    const out = fs.openSync(path.join(ws, '_claude.json'), 'w');
    const err = fs.openSync(path.join(ws, '_claude.stderr.txt'), 'w');
    // Workspaces live inside this repo: keep its CLAUDE.md and the user's auto-memory out of every arm.
    const env = { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };
    const p = spawn(process.env.CLAUDE_BIN || 'claude', args,
      { cwd: ws, stdio: ['ignore', out, err], env, detached: process.platform !== 'win32' });
    const timer = setTimeout(() => killTree(p), CELL_TIMEOUT_MS);
    p.on('close', () => { clearTimeout(timer); fs.closeSync(out); fs.closeSync(err); resolve(); });
  });
}

async function cell(dir, id, arm, model, n) {
  const ws = path.join(dir, `${id}__${arm}__${model}__${n}`);
  fs.rmSync(ws, { recursive: true, force: true }); // a rerun must not inherit a half-finished cell
  fs.mkdirSync(ws, { recursive: true });
  seed(ws);
  // --setting-sources project,local drops the user's globally enabled plugins, so each arm loads exactly
  // the one plugin it names. No shell tools, no MCP: the agent reads and writes files, then stops.
  const args = ['-p', TASKS[id].prompt, '--model', model, '--permission-mode', 'bypassPermissions',
    '--output-format', 'json', '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', 'Bash', 'PowerShell', '--append-system-prompt', NO_RUN];
  const plugin = ARMS[arm]();
  if (plugin) args.push('--plugin-dir', plugin);
  await claude(ws, args);
  // An error before any spend (not logged in, unknown model) is the harness's environment, not the
  // agent's answer: stop instead of scoring every cell as an empty diff.
  const j = session(ws);
  if (j.is_error && !j.total_cost_usd) fail(`${path.basename(ws)}: claude failed before doing anything: ${j.result}`);
  return ws;
}

function session(ws) {
  try { return JSON.parse(fs.readFileSync(path.join(ws, '_claude.json'), 'utf8')); } catch { return {}; } // crashed: scored as-is
}

function result(ws, compile) {
  const [task, arm, model, run] = path.basename(ws).split('__');
  const j = session(ws);
  return {
    task, arm, model, run: +run, ...score(task, ws, compile || fs.existsSync(path.join(ws, '_build.json'))),
    cost: j.total_cost_usd, seconds: j.duration_ms && j.duration_ms / 1000, turns: j.num_turns,
    models: Object.keys(j.modelUsage || {}), error: j.is_error ? j.result : undefined,
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null);

function report(dir, { compile, examples } = {}) {
  const cells = fs.readdirSync(dir)
    .filter((d) => d.split('__').length === 4 && TASKS[d.split('__')[0]])
    .map((d) => result(path.join(dir, d), compile));
  const groups = {};
  for (const c of cells) (groups[`${c.task}|${c.arm}|${c.model}`] ||= []).push(c);
  const rows = Object.values(groups).map((cs) => ({
    task: cs[0].task, arm: cs[0].arm, model: cs[0].model, n: cs.length,
    loc: median(cs.map((c) => c.loc)), correct: mean(cs.map((c) => c.correct)), safe: mean(cs.map((c) => c.safe)),
    tests: mean(cs.map((c) => +(c.testLoc > 0))),
    cost: mean(cs.filter((c) => c.cost != null).map((c) => c.cost)),
    seconds: mean(cs.filter((c) => c.seconds != null).map((c) => c.seconds)),
  })).sort((a, b) => `${a.task}${a.model}${a.arm}`.localeCompare(`${b.task}${b.model}${b.arm}`));
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(cells, null, 2));
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(rows, null, 2));
  console.table(rows);
  if (examples) writeExamples(dir, cells);
  return rows;
}

// examples/<task>.md: the verbatim diff of the median-LOC baseline and ponytail cell per task.
function writeExamples(dir, cells) {
  const out = path.join(ROOT, 'examples');
  fs.mkdirSync(out, { recursive: true });
  const table = [];
  const cellText = (c) => `${c.loc} lines, ${c.correct ? 'done' : c.builds === false ? '**build fails**' : '**not done**'}, ${c.safe ? 'safe' : '**unsafe**'}`;
  for (const id of Object.keys(TASKS)) {
    const pick = (arm) => {
      const cs = cells.filter((c) => c.task === id && c.arm === arm).sort((a, b) => a.loc - b.loc);
      return cs[Math.floor((cs.length - 1) / 2)];
    };
    const [b, p] = [pick('baseline'), pick('ponytail')];
    if (!b || !p) continue;
    const section = (title, c) => {
      const ws = path.join(dir, `${c.task}__${c.arm}__${c.model}__${c.run}`);
      const diff = git(ws, 'diff', '--cached', '--no-color', 'HEAD', '--', 'Source', 'Config');
      const log = c.builds === false ? fs.readFileSync(path.join(ws, '_build.log'), 'utf8') : '';
      const error = (log.match(/^.*\berror\b.*$/m) || [''])[0].replace(/^.*?(Source[\\/])/, '$1').trim();
      return `## ${title}: ${cellText(c)}\n\n` +
        `Model: ${c.models.join(', ') || c.model}. Scorer: ${c.why}.${error ? ` First build error: \`${error}\`` : ''}\n\n` +
        `\`\`\`diff\n${diff.trim() || '(no changes)'}\n\`\`\`\n`;
    };
    fs.writeFileSync(path.join(out, `${id}.md`),
      `# ${id}\n\n**Ticket:** "${TASKS[id].prompt}"\n\nVerbatim \`git diff\` from a benchmark run (run directory \`${path.basename(dir)}\`), ` +
      `the median-LOC cell of each arm. Reproduce: \`node benchmarks/run.js --all --examples\`.\n\n` +
      `${section('Without ponytail-ue', b)}\n${section('With ponytail-ue', p)}`);
    table.push(`| [${id}](${id}.md) | ${TASKS[id].prompt} | ${cellText(b)} | ${cellText(p)} |`);
  }
  fs.writeFileSync(path.join(out, 'README.md'),
    `# Examples\n\nReal agent output, not hand-written: the \`git diff\` a headless Claude Code session left in ` +
    `[benchmarks/fixture](../benchmarks/fixture) for each ticket, without and with ponytail-ue (median-LOC cell per arm, ` +
    `run \`${path.basename(dir)}\`). Regenerate with \`node benchmarks/run.js --all --examples\`; method in [../benchmarks/](../benchmarks/).\n\n` +
    `"Done" is the structural check${cells.some((c) => c.builds !== undefined) ? ' plus a real UBT build' : ''}; "safe" is the Unreal corner each ticket tempts ` +
    `(see [benchmarks/](../benchmarks/README.md#tasks)). One run is an example, not a benchmark result.\n\n` +
    `| Ticket | Task | Without ponytail-ue | With ponytail-ue |\n|---|---|---|---|\n${table.join('\n')}\n`);
  console.log(`wrote examples/ for ${table.length} task(s)`);
}

async function main() {
  const { values: o } = parseArgs({
    options: {
      selftest: { type: 'boolean' }, compile: { type: 'boolean' }, all: { type: 'boolean' }, examples: { type: 'boolean' },
      task: { type: 'string' }, arms: { type: 'string', default: 'baseline,ponytail' }, model: { type: 'string', default: 'sonnet' },
      runs: { type: 'string', default: '1' }, workers: { type: 'string', default: '4' }, report: { type: 'string' }, resume: { type: 'string' },
    },
  });
  if (o.report) return report(o.report, o);
  if (o.selftest) process.exit(selftest(o.compile) ? 1 : 0);
  if (selftest(false)) fail('scorers broken; refusing to spend on agent runs');

  const ids = o.all ? Object.keys(TASKS) : (o.task || fail('give --task <id[,id]>, --all, --selftest, or --report <dir>')).split(',');
  for (const id of ids) if (!TASKS[id]) fail(`unknown task ${id}; tasks: ${Object.keys(TASKS).join(', ')}`);
  const arms = o.arms.split(',');
  for (const arm of arms) if (!ARMS[arm]) fail(`unknown arm ${arm}; arms: ${Object.keys(ARMS).join(', ')}`);
  const v = spawnSync(process.env.CLAUDE_BIN || 'claude', ['--version'], { encoding: 'utf8' });
  if (v.error) fail('claude CLI not found; put it on PATH or set CLAUDE_BIN');

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = o.resume || path.join(process.env.BENCH_RUNS_DIR || path.join(__dirname, 'runs'), stamp);
  const specs = ids.flatMap((id) => o.model.split(',').flatMap((model) => arms.flatMap((arm) =>
    Array.from({ length: +o.runs }, (_, n) => [id, arm, model, n]))));
  // --resume <dir>: keep cells whose session finished and rerun the rest. A missing build verdict is
  // rebuilt by the closing report, not paid for again with a new session.
  const finished = (id, arm, model, n) => {
    try { JSON.parse(fs.readFileSync(path.join(dir, `${id}__${arm}__${model}__${n}`, '_claude.json'), 'utf8')); return true; } catch { return false; }
  };
  if (o.resume) specs.splice(0, specs.length, ...specs.filter((sp) => !finished(...sp)));
  console.log(`claude ${v.stdout.trim()}: ${specs.length} cells, ${o.workers} at a time -> ${dir}`);
  // To stop a run, kill the whole tree (taskkill /T /F /PID <pid>): killing only node orphans live sessions.
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: +o.workers }, async () => {
    while (next < specs.length) {
      const [id, arm, model, n] = specs[next++];
      const ws = await cell(dir, id, arm, model, n);
      const r = result(ws, o.compile);
      console.log(`[${++done}/${specs.length}] ${id}/${arm}/${model}#${n} loc=${r.loc} correct=${r.correct} safe=${r.safe} $${r.cost ?? '?'} ${r.seconds ?? '?'}s`);
    }
  }));
  report(dir, o);
}

module.exports = { TASKS, checkRefs, problems };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
