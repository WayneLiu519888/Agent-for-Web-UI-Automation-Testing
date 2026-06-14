#!/usr/bin/env node
/**
 * HTTP Streamable 传输入口
 *
 * 安全策略：HTTP 模式下必须设置 MCP_API_KEY，否则 process.exit(1)。
 * 因为 HTTP 端点可被远程访问，无认证运行等同于未授权任意代码执行。
 */

import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpServer } from "../server/factory.js";
import type { Request, Response, NextFunction } from "express";

function authMiddleware(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== apiKey) {
      res.status(401).json({ error: "Unauthorized — 需要有效的 Bearer Token" });
      return;
    }
    next();
  };
}

async function main() {
  const apiKey = process.env.MCP_API_KEY;

  if (!apiKey) {
    console.error("=".repeat(72));
    console.error("[MCP HTTP] 启动失败 — MCP_API_KEY 环境变量未设置");
    console.error("");
    console.error("HTTP 模式下 MCP_API_KEY 为必填项。请设置环境变量后重试：");
    console.error("");
    console.error("  Windows (PowerShell):  $env:MCP_API_KEY=\"your-api-key\"");
    console.error("  Windows (CMD):          set MCP_API_KEY=your-api-key");
    console.error("  macOS / Linux:          export MCP_API_KEY=\"your-api-key\"");
    console.error("");
    console.error("=".repeat(72));
    process.exit(1);
  }

  const mcpServer = createMcpServer("http");
  const app = createMcpExpressApp();

  console.log("[MCP HTTP] 已启用 Bearer Token 认证");

  const handleMcpRequest = async (req: Request, res: Response) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServer.connect(transport);
    res.on("close", () => transport.close());
    await transport.handleRequest(req, res, req.body);
  };

  app.post("/mcp", authMiddleware(apiKey), handleMcpRequest);

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
