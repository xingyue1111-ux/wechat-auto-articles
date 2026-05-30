"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RotateCcw, Terminal, Trash2 } from "lucide-react";

type ConsoleStatus = "idle" | "running" | "complete" | "error";

type ConsoleLog = {
  type: "log";
  level: "info" | "running" | "success" | "error";
  stage: string;
  message: string;
  detail?: string;
  timestamp: string;
};

type StreamEvent =
  | ConsoleLog
  | { type: "complete"; redirectUrl: string; timestamp: string }
  | { type: "error"; message: string; detail?: string; timestamp: string };

const initialLogs: ConsoleLog[] = [
  {
    type: "log",
    level: "info",
    stage: "system",
    message: "准备就绪。点击生成后，这里会实时显示每一步执行状态。",
    timestamp: new Date().toISOString()
  }
];

export function GenerateBriefForm() {
  const [status, setStatus] = useState<ConsoleStatus>("idle");
  const [logs, setLogs] = useState<ConsoleLog[]>(initialLogs);
  const outputRef = useRef<HTMLDivElement>(null);
  const isRunning = status === "running";

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  async function startGeneration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning) {
      return;
    }

    setLogs([]);
    setStatus("running");

    try {
      const response = await fetch("/api/admin/generate-stream", {
        method: "POST",
        headers: { Accept: "text/event-stream" }
      });
      if (!response.ok) {
        throw new Error(`生成接口返回 ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error("浏览器没有收到流式响应正文");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedTerminalEvent = false;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
        const packets = buffer.split("\n\n");
        buffer = packets.pop() ?? "";

        for (const packet of packets) {
          const data = packet
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6))
            .join("\n");
          if (data) {
            const streamEvent = JSON.parse(data) as StreamEvent;
            if (streamEvent.type === "complete" || streamEvent.type === "error") {
              receivedTerminalEvent = true;
            }
            handleStreamEvent(streamEvent);
          }
        }

        if (done) {
          break;
        }
      }

      if (!receivedTerminalEvent) {
        throw new Error("任务没有返回完成状态。可能已触发 Vercel 超时，请点击重试。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog({
        type: "log",
        level: "error",
        stage: "system",
        message: "生成连接中断",
        detail: message,
        timestamp: new Date().toISOString()
      });
      setStatus("error");
    }
  }

  function handleStreamEvent(event: StreamEvent) {
    if (event.type === "log") {
      appendLog(event);
      return;
    }
    if (event.type === "complete") {
      setStatus("complete");
      window.location.assign(event.redirectUrl);
      return;
    }
    appendLog({
      type: "log",
      level: "error",
      stage: "system",
      message: event.message,
      detail: event.detail,
      timestamp: event.timestamp
    });
    setStatus("error");
  }

  function appendLog(log: ConsoleLog) {
    setLogs((current) => [...current, log]);
  }

  function clearLogs() {
    if (!isRunning) {
      setLogs(initialLogs);
      setStatus("idle");
    }
  }

  return (
    <div className="generate-workbench">
      <form onSubmit={startGeneration} className="generate-form">
        <button type="submit" disabled={isRunning} aria-busy={isRunning}>
          {isRunning ? <LoaderCircle className="spin" size={18} /> : <ImagePlus size={18} />}
          <span style={{ marginLeft: 8 }}>{isRunning ? "生成中，请稍候" : "生成今日长图简报"}</span>
        </button>
        {status === "error" ? (
          <button type="submit" className="button secondary" aria-label="重试生成">
            <RotateCcw size={17} />
            <span style={{ marginLeft: 7 }}>重试</span>
          </button>
        ) : null}
      </form>

      <section className="output-console" aria-label="生成任务实时日志">
        <header className="output-console-header">
          <div className="output-console-title">
            <Terminal size={16} />
            <span>OUTPUT</span>
            <span className={`output-status ${status}`}>{statusLabel(status)}</span>
          </div>
          <button
            type="button"
            className="console-icon-button"
            onClick={clearLogs}
            disabled={isRunning}
            aria-label="清空日志"
            title="清空日志"
          >
            <Trash2 size={16} />
          </button>
        </header>

        <div className="output-console-body" ref={outputRef} aria-live="polite">
          {logs.map((log, index) => (
            <div className="console-line" key={`${log.timestamp}-${index}`}>
              <span className="console-time">{formatTime(log.timestamp)}</span>
              <span className={`console-level ${log.level}`}>{levelLabel(log.level)}</span>
              <span className="console-stage">{log.stage}</span>
              <span className="console-message">
                {log.message}
                {log.detail ? <span className="console-detail">{log.detail}</span> : null}
              </span>
            </div>
          ))}
          {isRunning ? <span className="console-cursor" aria-hidden="true" /> : null}
        </div>
      </section>
    </div>
  );
}

function statusLabel(status: ConsoleStatus): string {
  return {
    idle: "READY",
    running: "RUNNING",
    complete: "DONE",
    error: "FAILED"
  }[status];
}

function levelLabel(level: ConsoleLog["level"]): string {
  return {
    info: "INFO",
    running: "RUN",
    success: "OK",
    error: "ERROR"
  }[level];
}

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}
