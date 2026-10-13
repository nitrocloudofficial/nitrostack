# 🎓 Campus Sārathi

**AI-Powered Academic Agent built using the Model Context Protocol (MCP) and deployed with NitroStack.**

## 📖 Overview

Campus Sārathi is an AI-powered academic assistant that helps students manage their academic life through a single intelligent interface.

It is built using the **Model Context Protocol (MCP)** and the **NitroStack SDK**, enabling secure, permission-based access to Google services such as Gmail, Google Calendar, and Google Tasks. The MCP server is deployed on **NitroCloud** with secure Google OAuth authentication.

---

# ❗ Problem Statement

Students constantly switch between multiple applications such as:

- 📧 Gmail
- 📅 Google Calendar
- ✅ Google Tasks

Because academic information is scattered across these platforms, students often:

- Miss assignment deadlines
- Forget exams and meetings
- Overlook important academic emails
- Spend unnecessary time navigating between different applications

Although AI assistants can help organize this information, directly connecting personal Google accounts to an AI chatbot raises privacy concerns.

The **Model Context Protocol (MCP)** solves this challenge by providing **secure, permission-based access**, allowing the AI to retrieve only the information it needs while keeping users in complete control of their data.

---

# 💡 Solution

To address this problem, we developed **Campus Sārathi**, a centralized AI academic assistant powered by an MCP server.

Using the **official NitroStack SDK**, we built our own MCP server that exposes intelligent tools for securely accessing academic information from multiple Google services through a single interface.

The server is deployed on **NitroCloud** and secured using **Google OAuth 2.0**, ensuring safe and authorized access to user data.

---

# 🚀 Features

## 📅 Calendar Module

- Retrieve today's schedule
- View tomorrow's events
- Display weekly timetable
- Find free study slots
- Create calendar events

---

## 📧 Gmail Module

- Fetch unread academic emails
- Summarize lengthy emails
- Search emails
- Identify assignment-related messages

---

## ✅ Google Tasks Module

- View pending tasks
- Create new tasks
- Update existing tasks
- Mark tasks as completed
- Delete tasks

---

## 🧠 Planner Module

The Planner Module is the intelligence behind Campus Sārathi.

Rather than simply responding to questions, it acts as an intelligent orchestrator by:

- Collecting information from Google Calendar
- Reading important Gmail messages
- Checking Google Tasks
- Prioritizing important academic activities
- Generating a personalized **Daily Brief**
- Recommending the next best actions for the student

This demonstrates the true power of **Model Context Protocol (MCP)**, where the AI intelligently decides which tools to invoke, combines information from multiple services, and delivers meaningful recommendations through a single interface.

---

# ⚙️ Technology Stack

- Model Context Protocol (MCP)
- NitroStack SDK
- NitroCloud
- TypeScript
- Google OAuth 2.0
- Gmail API
- Google Calendar API
- Google Tasks API

---

# 🔒 Security

Campus Sārathi leverages **Model Context Protocol (MCP)** together with **Google OAuth 2.0** to ensure secure and permission-based access.

Users remain in full control of their personal data, and the AI only accesses information explicitly authorized by the user.

---

# 🌟 Benefits

- Centralized academic assistant
- Secure and privacy-preserving architecture
- Intelligent task prioritization
- Personalized Daily Brief
- Reduced application switching
- Improved academic productivity
- Secure access through MCP

---

# ☁️ Deployment

The MCP server is developed using the **NitroStack SDK** and deployed on **NitroCloud** with secure Google OAuth authentication.

---

# 📌 Conclusion

Campus Sārathi transforms fragmented academic information into one intelligent academic assistant.

By leveraging the **Model Context Protocol (MCP)** and **NitroStack**, it securely connects Gmail, Google Calendar, and Google Tasks, enabling students to stay organized, avoid missing deadlines, protect their privacy, and manage their academic life more efficiently.
