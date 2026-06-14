/**
 * 恒定时间字符串比较 — 防止时序攻击 (Timing Attack)
 *
 * 攻击者可以通过测量响应时间来逐个字符推断 Token。
 * crypto.timingSafeEqual 确保比较耗时仅取决于数据长度，而非内容差异。
 *
 * 当两个字符串长度不同时，填充到 maxLen 后执行 timingSafeEqual，
 * 确保长度差异也不会通过时间泄露。
 */
import { timingSafeEqual } from 'node:crypto';

export function safeCompare(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA !== lenB) {
    // 长度不同 — 必然不相等，但必须消耗等长时间以防长度信息泄露
    const maxLen = Math.max(lenA, lenB);
    const bufA = Buffer.alloc(maxLen);
    const bufB = Buffer.alloc(maxLen);
    bufA.write(a);
    bufB.write(b);
    timingSafeEqual(bufA, bufB);
    return false;
  }

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
