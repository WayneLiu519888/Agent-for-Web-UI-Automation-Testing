/**
 * Excel → YAML 测试用例转换器
 * 智能列名匹配（中英文多别名）
 */
import * as path from 'node:path';
import * as fs from 'node:fs';

const COLUMN_ALIASES: Record<string, string[]> = {
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

  return `id: "${id}"
title: "${title}"
priority: "${priority}"
environment: "${environment}"
${account ? 'account: "' + account + '"' : ''}
${tags ? 'tags: [' + tags.split(/[,，]/).map(t => '"' + t.trim() + '"').join(', ') + ']' : ''}
preconditions: |
  ${preconditions.replace(/\n/g, '\n  ')}
steps: |
  ${steps.replace(/\n/g, '\n  ')}
expected: |
  ${expected.replace(/\n/g, '\n  ')}
`;
}

export function convertXlsxToYaml(
  sourcePath: string,
  outputDir: string,
  sheetName?: string,
  defaultEnv?: string,
): { total: number; files: string[]; warnings: string[] } {
  // 依赖 xlsx 包动态加载
  let XLSX: any;
  try { XLSX = require('xlsx'); } catch { return { total: 0, files: [], warnings: ['xlsx package not installed'] }; }

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

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[mapping.id]?.trim();
    if (!id) continue;

    const yaml = convertRowToYaml(row, mapping, defaultEnv);
    const filePath = path.join(outDir, id + '.yaml');
    fs.writeFileSync(filePath, yaml, 'utf8');
    files.push(filePath);
  }

  return { total: files.length, files, warnings };
}
