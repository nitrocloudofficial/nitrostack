import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [] })
export class KnowledgeService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.KNOWLEDGE_ENGINE_API_URL || 'http://localhost:3001';
  }

  async search(query: string) {
    const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async createDocument(data: { title: string; source: string; content: string; format: string }) {
    const res = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async updateDocument(id: string, content: string) {
    const res = await fetch(`${this.baseUrl}/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async deleteDocument(id: string) {
    const res = await fetch(`${this.baseUrl}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return { success: true };
  }

  async getGraph() {
    const res = await fetch(`${this.baseUrl}/graph`);
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async getEntity(id: string) {
    const res = await fetch(`${this.baseUrl}/graph/entity/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async getHistory(id: string) {
    const res = await fetch(`${this.baseUrl}/documents/${id}/history`);
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }

  async getVersion(id: string, version: number) {
    const res = await fetch(`${this.baseUrl}/documents/${id}/version/${version}`);
    if (!res.ok) {
      throw new Error(`Knowledge Engine error: ${res.statusText}`);
    }
    return res.json();
  }
}
