import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';

/** Cordis plugin name used by loader diagnostics. */
export const name = 'deepseek-golden-partner';

/** The tool registry this plugin contributes to. */
export const inject = ['tools'];

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', '.next', '.nuxt',
  '.venv', 'venv', 'env', '__pycache__', '.mypy_cache', '.pytest_cache', 'target',
  'coverage', '.turbo', '.cache', '.gradle', 'obj', '.idea', 'vendor',
]);

const STACK_FILES = ['package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'composer.json', 'Gemfile'];

const MAX_EXCERPT_LINES = 60;

/** Resolve and validate the target directory. */
function resolveDir(dir) {
  const abs = path.resolve(dir && dir.trim() ? dir.trim() : process.cwd());
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    throw new Error(`目录不存在：${abs}`);
  }
  if (!stat.isDirectory()) throw new Error(`不是目录：${abs}`);
  return abs;
}

/** Keep a filename-safe, filesystem-friendly slug. */
function slugify(value, fallback) {
  const raw = String(value || '').trim();
  const safe = raw.replace(/[^\p{L}\p{N}\-_]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return safe || fallback;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function humanTime() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Breadth-first shallow listing; directories sort before files. */
function walkTree(rootAbs, maxFiles) {
  const out = [];
  const visit = (abs, prefix, depth) => {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (Number(b.isDirectory()) - Number(a.isDirectory())) || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        out.push(`${prefix}${entry.name}/`);
        if (depth < 2) visit(path.join(abs, entry.name), `${prefix}${entry.name}/`, depth + 1);
      } else {
        out.push(`${prefix}${entry.name}`);
      }
    }
  };
  visit(rootAbs, '', 0);
  return out;
}

function headLines(abs, lines) {
  try {
    const text = fs.readFileSync(abs, 'utf8');
    const all = text.split(/\r?\n/);
    const head = all.slice(0, lines);
    return { text: head.join('\n'), truncated: all.length > lines, total: all.length };
  } catch {
    return undefined;
  }
}

/** Short summary of the project's declared stack. */
function detectStack(rootAbs) {
  const parts = [];
  for (const file of STACK_FILES) {
    const abs = path.join(rootAbs, file);
    if (!fs.existsSync(abs)) continue;
    const head = headLines(abs, 40);
    if (!head) continue;
    parts.push(`- \`${file}\`（前 ${Math.min(head.text.split('\n').length, 40)} 行）\n\n\`\`\`\n${head.text.trim()}\n\`\`\``);
  }
  return parts.length ? parts.join('\n\n') : '（未找到 package.json / pyproject.toml 等清单文件）';
}

/** Standing conventions a planning model should respect. */
function detectConventions(rootAbs) {
  const parts = [];
  for (const [file, lines] of [['AGENTS.md', 30], ['README.md', 15]]) {
    const abs = path.join(rootAbs, file);
    if (!fs.existsSync(abs)) continue;
    const head = headLines(abs, lines);
    if (!head) continue;
    parts.push(`### ${file}\n\n\`\`\`\n${head.text.trim()}\n\`\`\`${head.truncated ? `\n（共 ${head.total} 行，仅前 ${lines} 行）` : ''}`);
  }
  return parts.length ? parts.join('\n\n') : '（没有 AGENTS.md / README.md 可参考）';
}

function gitBranch(rootAbs) {
  try {
    const head = fs.readFileSync(path.join(rootAbs, '.git', 'HEAD'), 'utf8').trim();
    const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    return match ? match[1] : `detached ${head.slice(0, 8)}`;
  } catch {
    return undefined;
  }
}

/** Excerpts for the paths the caller pointed at, bounded by maxChars. */
function excerpts(rootAbs, paths, maxChars) {
  const picked = (paths || []).filter((p) => typeof p === 'string' && p.trim()).slice(0, 12);
  if (!picked.length) return '';
  const chunks = [];
  let used = 0;
  for (const rel of picked) {
    const abs = path.resolve(rootAbs, rel);
    if (!abs.startsWith(rootAbs)) continue;
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      chunks.push(`### ${rel}\n\n（不存在）`);
      continue;
    }
    if (stat.isDirectory()) {
      const listing = walkTree(abs, 25).map((line) => `  ${line}`).join('\n');
      const block = `### ${rel}/（目录）\n\n\`\`\`\n${listing}\n\`\`\``;
      const room = maxChars - used;
      if (room < 200) break;
      const clipped = block.length > room ? `${block.slice(0, room)}\n…（已截断）` : block;
      used += clipped.length;
      chunks.push(clipped);
      continue;
    }
    const head = headLines(abs, MAX_EXCERPT_LINES);
    if (!head) continue;
    const block = `### ${rel}\n\n\`\`\`\n${head.text.trim()}\n\`\`\`${head.truncated ? `\n（共 ${head.total} 行，仅前 ${MAX_EXCERPT_LINES} 行）` : ''}`;
    const room = maxChars - used;
    if (room < 200) break;
    const clipped = block.length > room ? `${block.slice(0, room)}\n…（已截断）` : block;
    used += clipped.length;
    chunks.push(clipped);
  }
  return chunks.join('\n\n');
}

/** Read the Windows clipboard through a temporary UTF-8 file. */
function readClipboard() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('剪贴板读取目前只支持 Windows；请改为直接粘贴方案正文。'));
      return;
    }
    const tmp = path.join(os.tmpdir(), `dgp-clip-${process.pid}-${Date.now()}.txt`);
    const quoted = tmp.replace(/'/g, "''");
    const command = `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Clipboard -Raw | Set-Content -LiteralPath '${quoted}' -Encoding UTF8`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 20000, windowsHide: true }, () => {
      try {
        if (!fs.existsSync(tmp)) {
          reject(new Error('读取剪贴板失败：请确认剪贴板里有文本，或改为直接粘贴。'));
          return;
        }
        const text = fs.readFileSync(tmp, 'utf8').replace(/^\uFEFF/, '').trim();
        fs.rmSync(tmp, { force: true });
        if (!text) {
          reject(new Error('剪贴板是空的。'));
          return;
        }
        resolve(text);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

/** Section headings the caller can use to read the plan on demand. */
function headingsOf(text, limit) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const candidate = /^#{1,4}\s+\S/.test(trimmed) || /^【[^】]{1,24}】/.test(trimmed) || /^\d+[.、)]\s*\S/.test(trimmed);
    if (!candidate) continue;
    out.push(trimmed.replace(/^#+\s*/, '').slice(0, 60));
    if (out.length >= limit) break;
  }
  return out;
}

function buildPack(rootAbs, focus, paths, maxFiles, maxChars) {
  const tree = walkTree(rootAbs, Math.max(5, Math.min(maxFiles, 400)));
  const branch = gitBranch(rootAbs);
  const lines = [];
  lines.push(`# 上下文包 · ${focus}`);
  lines.push('');
  lines.push(`- 生成时间：${humanTime()}`);
  lines.push(`- 工作区：\`${rootAbs}\`${branch ? `（分支 ${branch}）` : ''}`);
  lines.push(`- 说明：这是给外部方案模型看的材料，只包含本次任务需要的部分。`);
  lines.push('');
  lines.push('## 一、目录结构（浅层，已跳过 node_modules/.git/dist 等）');
  lines.push('');
  lines.push('```');
  lines.push(tree.join('\n'));
  lines.push(tree.length >= maxFiles ? `（已截断，最多 ${maxFiles} 条）` : '```');
  if (tree.length >= maxFiles) lines.push('```');
  lines.push('');
  lines.push('## 二、技术栈与脚本');
  lines.push('');
  lines.push(detectStack(rootAbs));
  lines.push('');
  const excerpt = excerpts(rootAbs, paths, maxChars);
  if (excerpt) {
    lines.push('## 三、重点文件摘录');
    lines.push('');
    lines.push(excerpt);
    lines.push('');
  }
  lines.push('## 四、既有约定');
  lines.push('');
  lines.push(detectConventions(rootAbs));
  lines.push('');
  lines.push('## 五、请你输出');
  lines.push('');
  lines.push('按【执行简报】六段格式回答：目标 / 动哪里（文件与函数）/ 约束 / 验收 / 不要做 / 怎么验证（具体命令）。');
  lines.push('你看不到仓库其余部分，信息不足就最多问我 3 个问题，其余按最保守假设并在条目后标注「假设」。');
  lines.push('');
  return lines.join('\n');
}

/**
 * Compile the authoring shorthand (`required: true` on a property) into the raw
 * object-rooted JSON Schema that the model-facing registry expects. Tools
 * registered without `defineTool` are NOT normalized, so the schema must be
 * complete here: a bare property map is read by the provider as keywords, which
 * is why a property named "title" used to fail as `... is not of type "string"`.
 */
function parameterSchema(spec) {
  const properties = {};
  const required = [];
  for (const [key, node] of Object.entries(spec)) {
    const { required: isRequired, ...rest } = node;
    properties[key] = rest;
    if (isRequired === true) required.push(key);
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Register the handoff tools: one builds a context pack file, the other takes a
 * clipboard plan into a plan file. Both keep long text out of the conversation.
 */
export function apply(ctx) {
  const register = (definition) => {
    if (typeof ctx.effect === 'function') ctx.effect(() => ctx.tools.register(definition));
    else ctx.tools.register(definition);
  };
  register({
    name: 'handoff_pack',
    description:
      '把一个任务需要的仓库上下文（目录结构、技术栈、既有约定、指定文件的开头）汇成一份 markdown 文件，供外部聊天模型先做方案。只返回文件路径与统计，正文不进入对话。',
    parameters: parameterSchema({
      focus: {
        type: 'string',
        required: true,
        description: '这次要交出去的任务，一句话。',
      },
      dir: {
        type: 'string',
        description: '工作区绝对路径；省略时用宿主进程的当前目录。',
      },
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: '需要摘录开头的重点文件或目录（相对路径），最多 12 个。',
      },
      maxFiles: {
        type: 'integer',
        description: '目录清单最多列出的条目数，默认 60。',
      },
      maxChars: {
        type: 'integer',
        description: '重点文件摘录的总字符预算，默认 6000。',
      },
    }),
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'chars', 'sections'],
        properties: {
          path: { type: 'string', description: '上下文包文件的绝对路径。' },
          chars: { type: 'integer', description: '文件正文字符数。' },
          sections: { type: 'string', description: '小节标题，以 / 连接。' },
        },
      },
      render: (_args, value) => [
        {
          type: 'text',
          text: `已生成上下文包：${value.path}（${value.chars} 字）\n小节：${value.sections}\n正文没有进入对话，请打开该文件整段复制给外部模型。`,
        },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(args) {
      const rootAbs = resolveDir(args.dir);
      const maxFiles = Number.isInteger(args.maxFiles) ? args.maxFiles : 60;
      const maxChars = Number.isInteger(args.maxChars) ? args.maxChars : 6000;
      const body = buildPack(rootAbs, String(args.focus || '任务').trim(), args.paths, maxFiles, maxChars);
      const plans = path.join(rootAbs, 'plans');
      fs.mkdirSync(plans, { recursive: true });
      const file = path.join(plans, `_pack-${stamp()}.md`);
      fs.writeFileSync(file, body, 'utf8');
      const sections = headingsOf(body, 6).join(' / ') || '（无小节）';
      return { path: file, chars: body.length, sections };
    },
  });

  register({
    name: 'plan_intake',
    description:
      '把剪贴板里的方案正文保存成 plans/<时间>-<短名>.md 并加上状态头，返回路径与识别出的小节标题。适合把外部聊天模型输出的执行简报接进来，正文不进入对话，之后按小节按需读取。',
    parameters: parameterSchema({
      slug: {
        type: 'string',
        description: '文件名使用的短名，默认 clip。',
      },
      title: {
        type: 'string',
        description: '计划标题，默认取短名。',
      },
      dir: {
        type: 'string',
        description: '工作区绝对路径；省略时用宿主进程的当前目录。',
      },
    }),
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'chars', 'lines', 'headings'],
        properties: {
          path: { type: 'string', description: '计划文件的绝对路径。' },
          chars: { type: 'integer', description: '正文（不含状态头）字符数。' },
          lines: { type: 'integer', description: '正文行数。' },
          headings: { type: 'string', description: '识别出的小节标题，以 / 连接。' },
        },
      },
      render: (_args, value) => [
        {
          type: 'text',
          text: `已保存计划：${value.path}（${value.lines} 行，${value.chars} 字）\n小节：${value.headings}\n正文没有进入对话，需要时按小节读取。`,
        },
      ],
    },
    async execute(args) {
      const rootAbs = resolveDir(args.dir);
      const text = await readClipboard();
      const plans = path.join(rootAbs, 'plans');
      fs.mkdirSync(plans, { recursive: true });
      const title = String(args.title || args.slug || '剪贴板方案').trim();
      const file = path.join(plans, `${stamp()}-${slugify(args.slug, 'clip')}.md`);
      const header = [
        `# ${title}`,
        '状态: 待执行',
        `来源: 剪贴板 · ${humanTime()}`,
        '上下文: （待补充）',
        '',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(file, header + text + '\n', 'utf8');
      const found = headingsOf(text, 12);
      return {
        path: file,
        chars: text.length,
        lines: text.split(/\r?\n/).length,
        headings: found.length ? found.join(' / ') : '（没有识别到小节标题）',
      };
    },
  });
}
