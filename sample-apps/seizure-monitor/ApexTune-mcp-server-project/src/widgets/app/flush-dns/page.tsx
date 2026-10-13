'use client';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
interface D { message?: string; preview?: boolean; }
export default function FlushDnsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<D>();
  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const isPreview = data?.preview;
  const isSuccess = data?.message && !data?.preview && !data.message.includes('Could not');
  const accent = isPreview ? '#f59e0b' : isSuccess ? '#22c55e' : '#ef4444';
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background: bg, border:`1px solid ${border}`, borderRadius:'16px', padding:'20px', maxWidth:'320px', color: textColor, boxShadow: isDark?'0 8px 32px rgba(0,0,0,0.6)':'0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#06b6d4,#0891b2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🔄</div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700 }}>Flush DNS</div>
            <div style={{ fontSize:'11px', color: mutedColor, marginTop:'1px' }}>Clear DNS resolver cache</div>
          </div>
        </div>
        {data && <div style={{ fontSize:'11px', fontWeight:600, background: accent+'22', color: accent, borderRadius:'999px', padding:'4px 10px' }}>{isPreview?'Preview':isSuccess?'Done':'Error'}</div>}
      </div>
      <div style={{ height:'1px', background: border, marginBottom:'14px' }} />
      {!data ? <div style={{ textAlign:'center', color: mutedColor, fontSize:'13px', padding:'12px 0' }}>Waiting…</div>
        : <div style={{ padding:'14px', borderRadius:'12px', background: accent+'15', border:`1px solid ${accent}30`, fontSize:'13px', lineHeight:1.6, color: isSuccess?'#86efac':isPreview?'#fcd34d':'#fca5a5' }}>
            {isSuccess?'✓ ':isPreview?'👁 ':'✗ '}{data.message}
          </div>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'14px', fontSize:'11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
