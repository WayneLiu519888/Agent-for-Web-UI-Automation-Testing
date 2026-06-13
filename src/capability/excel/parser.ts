/** Excel 解析 — 列名匹配 */
export const COLUMN_ALIASES: Record<string, string[]> = {
  id: ['用例ID','编号','ID','Case ID','用例编号','case_id'],
  title: ['用例标题','标题','Title','测试用例标题','名称','Name'],
  priority: ['用例等级','优先级','等级','Priority','Level','严重程度'],
  preconditions: ['前置条件','前提','Preconditions','Pre-condition','前置'],
  steps: ['执行步骤','测试步骤','步骤','Steps','Test Steps','操作步骤'],
  expected: ['预期结果','期望结果','Expected','Expected Result','预期','验证点'],
  tags: ['标签','Tags','标签列表','分类'],
  environment: ['环境','测试环境','Environment','Env','环境名称'],
  account: ['账号','测试账号','Account','登录账号','用户名'],
};
export function matchColumns(headers: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (let i=0;i<headers.length;i++) {
    const h=headers[i].trim();
    for (const [f, aliases] of Object.entries(COLUMN_ALIASES))
      if (aliases.some(a=>a.toLowerCase()===h.toLowerCase())) { m[f]=i; break; }
  }
  return m;
}
