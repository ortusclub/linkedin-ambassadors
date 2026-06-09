export function CompareStyle() {
  return (
    <style>{`
      :root{
        --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
        --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;--red:#DC2626;--red-light:#FEF2F2;
        --radius:10px;--radius-lg:16px;
      }
      body{font-family:'Karla','Montserrat',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
      h1,h2,h3{font-family:'Montserrat','Karla',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
      .vs-page{max-width:1080px;margin:0 auto;padding:56px 40px 120px}
      .vs-crumb{font-size:13px;color:var(--text-light);margin-bottom:24px}
      .vs-crumb a{color:var(--text-light);text-decoration:none}
      .vs-crumb a:hover{color:var(--text)}
      .vs-header{max-width:760px;margin-bottom:32px}
      .vs-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
      .vs-title{font-size:clamp(30px,4vw,48px);line-height:1.12;letter-spacing:-0.03em;margin-bottom:16px}
      .vs-subtitle{font-size:17px;color:var(--text-mid);line-height:1.65}
      .vs-verdict{background:var(--blue-light);border:1px solid #BFDBFE;border-radius:var(--radius-lg);padding:22px 28px;margin-bottom:48px;display:flex;gap:18px;align-items:flex-start}
      .vs-verdict-label{flex-shrink:0;background:var(--blue);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;padding:4px 10px;border-radius:6px;margin-top:2px}
      .vs-verdict p{margin:0;font-size:15px;color:var(--text);line-height:1.65}
      .vs-table-section{margin-bottom:56px}
      .vs-table-section h2{font-size:24px;margin-bottom:20px}
      .vs-table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
      .vs-table{width:100%;border-collapse:collapse;font-size:14px}
      .vs-table th{text-align:left;padding:14px 20px;background:var(--surface-alt);font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-mid);border-bottom:1px solid var(--border)}
      .vs-table td{padding:14px 20px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
      .vs-table tr:last-child td{border-bottom:none}
      .vs-feature{font-weight:600;color:var(--text);width:30%}
      .vs-good{color:var(--green-dark);background:rgba(0,184,92,0.04)}
      .vs-bad{color:var(--red);background:rgba(220,38,38,0.03)}
      .vs-detail{margin-bottom:64px}
      .vs-detail h2{font-size:22px;margin:32px 0 12px}
      .vs-detail h2:first-child{margin-top:0}
      .vs-detail p{font-size:15px;color:var(--text-mid);line-height:1.75;margin:0}
      .vs-faq{margin-bottom:64px}
      .vs-faq h2{font-size:24px;margin-bottom:20px}
      .vs-faq-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:10px;padding:18px 22px}
      .vs-faq-item summary{font-weight:600;font-size:15px;cursor:pointer;color:var(--text);list-style:none}
      .vs-faq-item summary::-webkit-details-marker{display:none}
      .vs-faq-item summary::after{content:'+';float:right;color:var(--text-light);font-weight:400}
      .vs-faq-item[open] summary::after{content:'−'}
      .vs-faq-item p{margin:14px 0 0;font-size:14px;color:var(--text-mid);line-height:1.7}
      .vs-cta{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:36px 32px;text-align:center}
      .vs-cta h2{font-size:24px;margin:0 0 8px}
      .vs-cta p{font-size:14px;color:var(--text-mid);margin:0 0 22px}
      .vs-cta-row{display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center}
      .vs-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:600;text-decoration:none}
      .vs-btn-primary:hover{background:var(--blue-dark)}
      .vs-btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:#fff;color:var(--text);font-size:15px;font-weight:600;text-decoration:none;border:1px solid var(--border)}
      .vs-btn-secondary:hover{border-color:var(--text)}
      @media(max-width:700px){
        .vs-page{padding:32px 16px 80px}
        .vs-table{font-size:13px}
        .vs-table th,.vs-table td{padding:10px 12px}
        .vs-feature{width:28%}
      }
    `}</style>
  );
}
