#!/usr/bin/env node
/**
 * HTTP Streamable 传输入口
 *
 * 安全策略：IP 白名单 — 仅允许配置文件中指定的 IP 地址访问 /mcp 端点。
 * 白名单在 mcp.config.yaml 的 ip_whitelist 字段中配置，默认仅允许本机回环地址。
 */

import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpServer } from "../server/factory.js";
import { loadConfig } from "../capability/config/loader.js";
import type { Request, Response, NextFunction } from "express";

/**
 * IP 白名单中间件
 * 从请求中提取客户端 IP，与配置的白名单精确匹配。
 * 不在白名单中的 IP 返回 403。
 */
function ipWhitelistMiddleware(whitelist: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Express 的 req.ip 已经是规范化后的 IP（去掉 IPv6 前缀等）
    const clientIp = req.ip || req.socket.remoteAddress || '';

    // 精确匹配
    const allowed = whitelist.some(entry => {
      // 支持 CIDR 子网匹配
      if (entry.includes('/')) {
        return ipInCIDR(clientIp, entry);
      }
      return clientIp === entry;
    });

    if (!allowed) {
      res.status(403).json({
        error: "Forbidden — 客户端 IP 不在白名单中",
        ip: clientIp,
      });
      return;
    }
    next();
  };
}

/**
 * 简易 CIDR 匹配（仅支持 /8, /16, /24, /32 等整字节掩码）
 */
function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits)) return false;

  // 将 IP 转换为 32 位整数比较
  const ipNum = ip4ToInt(ip);
  const rangeNum = ip4ToInt(range);
  if (ipNum === null || rangeNum === null) return false;

  const mask = ~(2 ** (32 - bits) - 1) >>> 0; // 无符号 32 位掩码
  return (ipNum & mask) === (rangeNum & mask);
}

function ip4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

async function main() {
  const config = loadConfig();
  const whitelist = config.ip_whitelist;

  console.log('[MCP HTTP] IP 白名单:', whitelist.join(', '));

  const mcpServer = createMcpServer("http");
  const app = createMcpExpressApp();

  const handleMcpRequest = async (req: Request, res: Response) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServer.connect(transport);
    res.on("close", () => transport.close());
    await transport.handleRequest(req, res, req.body);
  };

  app.post("/mcp", ipWhitelistMiddleware(whitelist), handleMcpRequest);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const host = process.env.MCP_HOST || "127.0.0.1";
  const port = parseInt(process.env.PORT || "3000", 10);

  app.listen(port, host, () => {
    console.log("[MCP HTTP] 服务已启动 -> http://" + host + ":" + port + "/mcp");
    console.log("[MCP HTTP] 健康检查 -> http://" + host + ":" + port + "/health");
  });
}

main().catch((err) => {
  console.error("[MCP HTTP] 启动失败:", err);
  process.exit(1);
});
