import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { SUGGESTIONS, answer } from '../assistantEngine';

const WELCOME = { id: 'w', role: 'ai', text: "Hello, I'm your hotel assistant. Ask me about room availability, guests, check-ins, check-outs or occupancy — I always use the latest hotel data.", follow: SUGGESTIONS.slice(0, 2) };

function AiBody({ m, onAsk }) {
  return (
    <>
      <p>{m.text}</p>
      {m.sections?.map((s) => (
        <div className="ai-sec" key={s.label}>
          <h5>{s.label}</h5>
          {s.chips && <div className="chips">{s.chips.map((c) => <span key={c}>{c}</span>)}</div>}
          {s.lines && <ul>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
      ))}
      {m.follow && <div className="follow">{m.follow.map((s) => <button key={s} onClick={() => onAsk(s)}>{s}</button>)}</div>}
    </>
  );
}

export default function Assistant() {
  const { rooms, guests, loading } = useHotel();
  const [msgs, setMsgs] = useState([WELCOME]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const data = useRef({ rooms, guests });
  data.current = { rooms, guests }; // always answer from the freshest hotel data

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typing]);

  const ask = (question) => {
    const q = (question ?? text).trim();
    if (!q || typing) return;
    setText('');
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: q }]);
    setTyping(true);
    setTimeout(() => {
      const reply = answer(q, data.current);
      setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'ai', ...reply }]);
      setTyping(false);
    }, 1000 + Math.random() * 900);
  };

  return (
    <div className="assistant">
      <section className="card chat">
        <header className="chat-head">
          <div className="ai-avatar"><Sparkles size={20} /></div>
          <div><b>Aurelia Assistant</b><small><i className="live" /> Online · connected to live hotel data</small></div>
        </header>
        <div className="chat-body">
          {msgs.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === 'ai' && <div className="ai-avatar sm"><Sparkles size={14} /></div>}
              <div className="bubble">{m.role === 'ai' ? <AiBody m={m} onAsk={ask} /> : m.text}</div>
            </div>
          ))}
          {typing && <div className="msg ai"><div className="ai-avatar sm"><Sparkles size={14} /></div><div className="bubble typing"><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about rooms, guests, check-outs…" disabled={loading} />
          <button className="btn primary" type="submit" disabled={!text.trim() || typing} aria-label="Send"><Send size={17} /></button>
        </form>
      </section>
      <aside className="card suggest">
        <h3>Suggested questions</h3>
        <p className="muted small">Tap a question, or type your own — variations like "show empty rooms" work too.</p>
        {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} disabled={typing}>{s}</button>)}
      </aside>
    </div>
  );
}
