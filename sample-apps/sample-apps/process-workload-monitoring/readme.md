# Linux Process & Workload Monitoring System (MCP Server)

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastMCP](https://img.shields.io/badge/MCP-FastMCP-green.svg)](https://github.com/jlowin/fastmcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An **AI-native real-time system health and workload monitoring server** built on the **Model Context Protocol (MCP)** using **FastMCP** and **LangChain**. Designed for MLOps engineers and system administrators, this system allows LLMs and autonomous agents to inspect Linux kernel diagnostics, tail system logs, audit GPU/CPU telemetry, and automatically dispatch critical incident reports.

---

## 🌟 Key Features

- 🖥️ **Hardware Telemetry (`hardware_telemetry`)**: Monitors real-time CPU (per-core load, frequency, thermal zones), RAM/Swap utilization, and NVIDIA GPU statistics (VRAM, SM clocks, core load, power draw, temperature via `pynvml`).
- 🐧 **Kernel Ring Buffer Audit (`kernel_dmesg`)**: Queries `dmesg` logs to diagnose hardware failures, GPU driver crashes, segmentation faults, and Out-Of-Memory (OOM) kills.
- 📋 **OS System Log Inspection (`syslog_tail`)**: Tails `/var/log/syslog` and `/var/log/messages` for daemon crashes, network drops, and SSH events.
- 📜 **Application Log Auditing (`application_logs`)**: Reads standard output and error (`stdout`/`stderr`) logs to isolate stack traces and exception tracebacks.
- 📧 **Automated Incident Alerting (`send_incident_report`)**: Dispatches detailed email incident reports to human operators via Gmail SMTP (with SSL/STARTTLS fallback).
- 🤖 **LangChain AI Agent (`langchainAgent.py`)**: Integrates an intelligent agent capable of reasoning over system states and invoking appropriate diagnostic tools.
- ⚡ **Benchmarking Suite (`benchmark_mcp.py`)**: Built-in benchmark harness to measure direct tool execution latencies and FastMCP server performance.

---

## 🏗️ Architecture & Project Structure

```
├── mcp_server.py                      # Main FastMCP Server (stdio & SSE transport modes)
├── metricsTool.py                     # Hardware telemetry collection (CPU, RAM, NVIDIA GPU)
├── dmesgTool.py                       # Linux kernel ring buffer log parser
├── syslogTool.py                      # System log tail reader
├── standardStreamMoniteringTool.py    # Application log reader (stdout/stderr)
├── notificationTool.py                # Email incident report dispatcher (SMTP)
├── langchainAgent.py                  # LangChain agent wrapper for automated reasoning
├── benchmark_mcp.py                   # Performance benchmarking script
├── requirements.txt                   # Python dependency manifest
├── Dockerfile                         # Container configuration for cloud deployment
└── .env                               # Environment variables (secrets/keys)
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Linux** (or WSL2 / Linux container on Windows)
- **Python 3.10+**
- Optional: NVIDIA GPU with drivers installed (for `pynvml` GPU metrics)

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/arjun1665/process-workload-monitoring-system-for-Linux.git
cd process-workload-monitoring-system-for-Linux

pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
SMTP_PASSWORD=your_app_specific_password_here
```

> **Note**: Never commit your `.env` file to version control.

---

## 💻 Usage

### Running the MCP Server

#### Stdio Mode (Default for local MCP clients like Claude Desktop / Cursor):
```bash
python mcp_server.py
```

#### SSE / HTTP Transport Mode (For NitroCloud / Remote Cloud Deployments):
```bash
python mcp_server.py --sse
```
The server will start listening on `http://0.0.0.0:3999`.

---

### Running Benchmarks

Measure tool latency and server execution performance:

```bash
python benchmark_mcp.py
```

---

### Running the LangChain Agent

To launch the autonomous diagnostic agent:

```bash
python langchainAgent.py
```

---

## 🐳 Docker & Cloud Deployment (NitroStack / NitroCloud)

A pre-configured `Dockerfile` is included for containerized deployments:

```bash
# Build Docker image
docker build -t process-workload-monitoring .

# Run container
docker run -d -p 3999:3999 --name workload-monitor process-workload-monitoring
```

---

## 🛠️ MCP Tools Overview

| Tool | Function Name | Description |
| :--- | :--- | :--- |
| `kernel_dmesg` | `get_kernel_dmesg()` | Fetches last $N$ lines from Linux `dmesg` |
| `syslog_tail` | `get_syslog_tail()` | Tails OS-level system logs |
| `application_logs` | `read_application_logs()` | Reads application log files |
| `hardware_telemetry` | `get_hardware_telemetry()` | Obtains CPU, RAM, and GPU telemetry in JSON |
| `send_incident_report` | `dispatch_incident_report()` | Sends email report via SMTP |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
