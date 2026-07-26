const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

export async function processMeetingAPI(contextPackId: string, inputSource: string, meetingUrl?: string, transcriptText?: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-alex-rivers'
      },
      body: JSON.stringify({
        input_source: inputSource,
        meeting_url: meetingUrl,
        transcript_text: transcriptText,
        context_pack_id: contextPackId,
        workspace_id: 'ws-acme'
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or returning fallback:', err);
    return null;
  }
}

export async function approveTaskAPI(taskId: string, action: 'approve' | 'reject' | 'edit') {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/tasks/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-alex-rivers'
      },
      body: JSON.stringify({
        task_id: taskId,
        action: action
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or returning fallback:', err);
    return null;
  }
}

export async function searchVectorMemoryAPI(queryText: string, topK: number = 5) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/memory/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-alex-rivers'
      },
      body: JSON.stringify({
        query_text: queryText,
        top_k: topK,
        workspace_id: 'ws-acme'
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or returning fallback:', err);
    return null;
  }
}

export async function testMCPIntegrationAPI(integrationKey: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/integrations/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-alex-rivers'
      },
      body: JSON.stringify({
        integration_key: integrationKey
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or returning fallback:', err);
    return null;
  }
}
