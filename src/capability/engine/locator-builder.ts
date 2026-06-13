/**
 * 多策略定位器构建器
 * 从 AccTreeNode 提取所有 Playwright Locator 候选
 */
import type { AccTreeNode, CssLocator, Locators } from '../../types/yaml.js';

export function buildLocators(node: AccTreeNode): Locators {
  const d = node.dom;
  const a = node.a11y;
  const locators: Locators = {};

  // getByTestId — 最高优先级
  const testIds: string[] = [];
  if (d.attributes.dataTestid) testIds.push(d.attributes.dataTestid);
  if (d.attributes.dataQa) testIds.push(d.attributes.dataQa);
  if (d.attributes.dataCy) testIds.push(d.attributes.dataCy);
  if (testIds.length) locators.getByTestId = testIds;

  // getByRole
  if (a.role !== 'generic' && a.name) {
    locators.getByRole = [a.role, { name: a.name }];
  }

  // getByPlaceholder
  if (d.attributes.placeholder) {
    locators.getByPlaceholder = [d.attributes.placeholder];
  }

  // getByLabel
  if (d.attributes.ariaLabel) {
    locators.getByLabel = d.attributes.ariaLabel;
  }

  // getByText
  if (a.name && a.name.length < 100) {
    locators.getByText = [a.name];
  }

  // CSS 候选选择器（按优先级排列）
  const cssCandidates: CssLocator[] = [];

  // 优先级 1: ID（安全转义特殊字符）
  if (d.id) {
    // CSS 标识符转义：非字母数字开头或含特殊字符则转义
    const safe = /^[a-zA-Z_][\w-]*$/.test(d.id) ? d.id : d.id.replace(/([!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g, '\\$1');
    cssCandidates.push({ selector: '#' + safe, priority: 1, strategy: 'id', uniqueness: 1, sample: false });
  }

  // 优先级 1: data-testid (转义值中的双引号)
  if (d.attributes.dataTestid) {
    const safeValue = d.attributes.dataTestid.replace(/"/g, '\\"');
    cssCandidates.push({
      selector: '[data-testid="' + safeValue + '"]',
      priority: 1, strategy: 'testid', uniqueness: 1, sample: false,
    });
  }

  // 优先级 2: class-chain (前2个class)
  if (d.className) {
    const classes = d.className.split(/\s+/).filter(c => c.length > 2).slice(0, 2);
    if (classes.length) {
      cssCandidates.push({
        selector: d.tagName + '.' + classes.join('.'),
        priority: 2, strategy: 'class-chain', uniqueness: -1, sample: false,
      });
    }
  }

  // 优先级 3: Vue scoped + class
  if (d.attributes.dataVAttrs?.length && d.className) {
    const firstClass = d.className.split(/\s+/)[0];
    if (firstClass) {
      cssCandidates.push({
        selector: d.tagName + '.' + firstClass + '[' + d.attributes.dataVAttrs[0] + ']',
        priority: 3, strategy: 'data-attr', uniqueness: -1, sample: false,
      });
    }
  }

  if (cssCandidates.length) locators.css = cssCandidates;

  return locators;
}
