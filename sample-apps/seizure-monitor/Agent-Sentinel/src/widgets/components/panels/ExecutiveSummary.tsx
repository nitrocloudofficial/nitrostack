'use client';

export default function ExecutiveSummary() {
  return (
    <div
      style={{
        marginTop: 30,
        background: "linear-gradient(135deg,#2563EB,#1E40AF)",
        borderRadius: 16,
        padding: 30,
      }}
    >
      <h2
        style={{
          color: "white",
          marginBottom: 18,
        }}
      >
        🧠 Executive AI Summary
      </h2>

      <p
        style={{
          color: "#E5E7EB",
          lineHeight: 1.8,
          fontSize: 16,
        }}
      >
        AgentSentinel analysed enterprise activity across connected AI agents,
        Gmail, GitHub, Calendar and Discord.

        <br /><br />

        Overall security posture is <strong>Healthy</strong>.

        <br /><br />

        • Security Score increased by 4%.

        <br />

        • One GitHub secret exposure requires review.

        <br />

        • Prompt Injection attempts were successfully blocked.

        <br />

        • No compliance violations detected.

        <br /><br />

        Recommendation:
        Continue monitoring AI Agents while investigating the detected GitHub exposure.
      </p>
    </div>
  );
}