/**
 * Excel → YAML 测试用例转换器
 * 智能列名匹配（中英文多别名）
 *
 * 安全注意事项（P1）：
 *   - 依赖 xlsx (SheetJS) 已停维，存在原型污染漏洞 (GHSA-4r6h-8v6p-xvw6)
 *   - 缓解策略：入口处强制文件大小限制(10MB)、格式白名单(.xlsx/.xls)
 *   - 长期方案：评估迁移至 ExcelJS 或仅接受 YAML 输入
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { dump } from 'js-yaml';


const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls"]);

function validateSourceFile(sourcePath: string): string | null {
  if (!fs.existsSync(sourcePath)) return "文件不存在: " + sourcePath;
  var ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return "不支持的文件格式: " + ext + "。仅允许 .xlsx / .xls 文件";
  try { var stat = fs.statSync(sourcePath); if (stat.size > MAX_FILE_SIZE) { var mb = (stat.size / (1024 * 1024)).toFixed(1); return "文件过大: " + mb + "MB (上限 10MB)。请拆分文件或使用 YAML 输入"; } } catch { return "无法读取文件信息: " + sourcePath; }
  return null;
}


export const COLUMN_ALIASES: Record<string, string[]> = {
  id: ['用例ID', '编号', 'ID', 'Case ID', '用例编号', 'case_id'],
  title: ['用例标题', '标题', 'Title', '测试用例标题', '名称', 'Name'],
  priority: ['用例等级', '优先级', '等级', 'Priority', 'Level', '严重程度'],
  preconditions: ['前置条件', '前提', 'Preconditions', 'Pre-condition', '前置'],
  steps: ['执行步骤', '测试步骤', '步骤', 'Steps', 'Test Steps', '操作步骤'],
  expected: ['预期结果', '期望结果', 'Expected', 'Expected Result', '预期', '验证点'],
  tags: ['标签', 'Tags', '标签列表', '分类'],
  environment: ['环境', '测试环境', 'Environment', 'Env', '环境名称'],
  account: ['账号', '测试账号', 'Account', '登录账号', '用户名'],
};

export function matchColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(a => a.toLowerCase() === h.toLowerCase())) {
        mapping[field] = i;
        break;
      }
    }
  }
  return mapping;
}

export function convertRowToYaml(
  row: string[],
  mapping: Record<string, number>,
  defaultEnv?: string,
): string {
  const get = (field: string) => {
    const idx = mapping[field];
    return idx !== undefined ? row[idx]?.trim() || '' : '';
  };

  const id = get('id');
  const title = get('title');
  const priority = get('priority') || 'P2';
  const preconditions = get('preconditions');
  const steps = get('steps');
  const expected = get('expected');
  const tags = get('tags');
  const environment = get('environment') || defaultEnv || '';
  const account = get('account');

  // 使用 js-yaml dump 安全序列化，避免特殊字符破坏 YAML（ESM 静态导入）
  const obj: Record<string, unknown> = {
    id, title, priority, environment,
    preconditions, steps, expected,
  };
  if (account) obj.account = account;
  if (tags) obj.tags = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);

  return dump(obj, {
    lineWidth: -1,        // 不自动折行
    noRefs: true,
    quotingType: '"',     // 强制双引号保证安全
    forceQuotes: true,
  });
}

export async function convertXlsxToYaml(
  sourcePath: string,
  outputDir: string,
  sheetName?: string,
  defaultEnv?: string,
): Promise<{ total: number; files: string[]; warnings: string[] }> {
  // --- 安全校验：文件大小、格式白名单 ---
  const fileError = validateSourceFile(sourcePath);
  if (fileError) {
    return { total: 0, files: [], warnings: [fileError] };
  }

  // 使用 ESM 动态 import() 加载 xlsx，保持防御性兜底
  let XLSX: any;
  try {
    const xlsxMod = await import('xlsx');
    // CJS interop: esModuleInterop 不影响运行时动态 import，需手动处理
    XLSX = (xlsxMod as any).default ?? xlsxMod;
  } catch {
    return { total: 0, files: [], warnings: ['xlsx package not installed'] };
  }

  const workbook = XLSX.readFile(sourcePath);
  const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { total: 0, files: [], warnings: ['sheet not found: ' + (sheetName || workbook.SheetNames[0])] };

  const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (data.length < 2) return { total: 0, files: [], warnings: ['empty sheet'] };

  const headers = data[0];
  const mapping = matchColumns(headers);
  const warnings: string[] = [];

  // 检查关键列
  for (const key of ['id', 'title', 'steps', 'expected']) {
    if (mapping[key] === undefined) warnings.push('missing column: ' + key);
  }
  if (warnings.length > 0) return { total: 0, files: [], warnings };

  const files: string[] = [];
  const category = path.basename(sourcePath, path.extname(sourcePath));
  const outDir = path.join(outputDir, category);
  fs.mkdirSync(outDir, { recursive: true });

  // 每行单独 try-catch，单行失败不中断批量写入
  for (let i = 1; i < data.length; i++) {
    try {
      const row = data[i];
      const id = row[mapping.id]?.trim();
      if (!id) continue;

      const yaml = convertRowToYaml(row, mapping, defaultEnv);
      // 文件名 sanitize：替换文件系统非法字符为下划线
      const safeId = id.replace(/[<>:"/\|?*]/g, '_');
      const filePath = path.join(outDir, safeId + '.yaml');
      fs.writeFileSync(filePath, yaml, 'utf8');
      files.push(filePath);
    } catch (err: unknown) {
      warnings.push(`行 ${i + 1} 写入失败: ${(err as Error)?.message || String(err)}`);
    }
  }

  return { total: files.length, files, warnings };
}


