import { useState, useEffect, useCallback } from "react";

// ── Palette & helpers ─────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3e",
  accent: "#ff4d1c",
  accentDim: "#ff4d1c33",
  gold: "#f5a623",
  text: "#f0f0f8",
  muted: "#7070a0",
  green: "#00e5a0",
  blue: "#4d9fff",
};

const WOD_TYPES = ["AMRAP", "For Time", "EMOM", "Chipper", "Benchmark", "Strength", "Skill", "Hero WOD"];
const MOVEMENTS = ["Snatch", "Clean & Jerk", "Clean", "Deadlift", "Back Squat", "Front Squat", "Overhead Squat", "Press", "Push Press", "Thruster"];
const BENCHMARKS = ["Fran", "Grace", "Helen", "Cindy", "Murph", "Annie", "Barbara", "Chelsea", "Elizabeth", "Jackie", "Karen", "Kelly", "Nancy", "Amanda"];
const SKILLS = ["Muscle-up (rings)", "Muscle-up (bar)", "Handstand walk", "Handstand push-up", "Double-unders", "Pistol squat", "Rope climb", "Toes-to-bar", "Kipping pull-up", "Butterfly pull-up"];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const FULL_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatDate(d) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Storage helpers ───────────────────────────────────────────────────────────
const KEYS = { users: "cf_users", sessions: "cf_sessions", current: "cf_current" };
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ── CSS-in-JS style injection ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; color: #f0f0f8; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #12121a; } ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
  input, select, textarea { outline: none; background: #1a1a26; color: #f0f0f8; border: 1px solid #2a2a3e; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 14px; width: 100%; transition: border-color .2s; }
  input:focus, select:focus, textarea:focus { border-color: #ff4d1c; }
  button { cursor: pointer; font-family: inherit; border: none; border-radius: 8px; transition: all .15s; }
  select option { background: #1a1a26; }
  .fade-in { animation: fadeIn .3s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 #ff4d1c44; } 50% { box-shadow: 0 0 0 8px #ff4d1c00; } }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = { padding: "10px 20px", fontWeight: 600, fontSize: 14, letterSpacing: ".3px", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "all .15s", ...style };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff" },
    ghost:   { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` },
    danger:  { background: "#ff1c1c22", color: "#ff6060", border: "1px solid #ff1c1c44" },
    green:   { background: COLORS.green + "22", color: COLORS.green, border: `1px solid ${COLORS.green}44` },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, ...style }}>{children}</div>;
}

function Badge({ label, color = COLORS.accent }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
}

function StatBox({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontFamily: "'Bebas Neue'", color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [err, setErr] = useState("");

  const handleSubmit = () => {
    setErr("");
    const users = load(KEYS.users) || {};
    if (mode === "register") {
      if (!form.username || !form.password || !form.name) return setErr("Rellena todos los campos.");
      if (users[form.username]) return setErr("Ese usuario ya existe.");
      users[form.username] = { password: form.password, name: form.name, createdAt: new Date().toISOString() };
      save(KEYS.users, users);
      onLogin({ username: form.username, name: form.name });
    } else {
      if (!users[form.username] || users[form.username].password !== form.password) return setErr("Usuario o contraseña incorrectos.");
      onLogin({ username: form.username, name: users[form.username].name });
    }
  };

  const F = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, letterSpacing: 3, color: COLORS.accent, lineHeight: 1 }}>WODLOG</div>
          <div style={{ color: COLORS.muted, fontSize: 13, letterSpacing: 2, marginTop: 4 }}>CROSSFIT TRACKER</div>
        </div>

        <Card>
          {/* Toggle */}
          <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, background: mode === m ? COLORS.accent : "transparent", color: mode === m ? "#fff" : COLORS.muted, border: "none", cursor: "pointer", transition: "all .2s" }}>
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && <input placeholder="Nombre completo" value={form.name} onChange={F("name")} />}
            <input placeholder="Usuario" value={form.username} onChange={F("username")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <input type="password" placeholder="Contraseña" value={form.password} onChange={F("password")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            {err && <div style={{ color: "#ff6060", fontSize: 13, background: "#ff000015", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            <Btn onClick={handleSubmit} style={{ marginTop: 4, padding: "12px 0", fontSize: 15, letterSpacing: ".5px" }}>
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Btn>
          </div>
        </Card>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 20 }}>
          Los datos se guardan en este navegador · Sin servidores · Gratis
        </div>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 11, marginTop: 10, letterSpacing: ".5px" }}>
          Creada por <span style={{ color: COLORS.accent, fontWeight: 600 }}>Maria Costas</span>
        </div>
      </div>
    </div>
  );
}

// ── Log Workout Form ──────────────────────────────────────────────────────────
function LogWorkout({ user, onSave, onCancel }) {
  const [type, setType] = useState("WOD");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "AMRAP",
    description: "",
    result: "",
    resultUnit: "min",
    movement: MOVEMENTS[0],
    weight: "",
    weightUnit: "kg",
    reps: "",
    benchmark: BENCHMARKS[0],
    skill: SKILLS[0],
    skillLevel: "Logrado",
    notes: "",
    rx: true,
    rating: 3,
  });
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const FB = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.date) return;
    const session = { id: uid(), userId: user.username, createdAt: new Date().toISOString(), type, ...form };
    const sessions = load(KEYS.sessions) || [];
    sessions.push(session);
    save(KEYS.sessions, sessions);
    onSave();
  };

  const Label = ({ children }) => <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>{children}</div>;

  return (
    <div className="fade-in" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onCancel} style={{ padding: "8px 14px" }}>← Volver</Btn>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1, color: COLORS.text }}>Registrar entreno</h2>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Type selector */}
        <div>
          <Label>Tipo de registro</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["WOD", "Levantamiento", "Benchmark", "Skill"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: "8px 16px", borderRadius: 20, fontWeight: 600, fontSize: 13, background: type === t ? COLORS.accent : COLORS.surface, color: type === t ? "#fff" : COLORS.muted, border: `1px solid ${type === t ? COLORS.accent : COLORS.border}`, cursor: "pointer", transition: "all .2s" }}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <Label>Fecha</Label>
          <input type="date" value={form.date} onChange={F("date")} />
        </div>

        {type === "WOD" && <>
          <div>
            <Label>Categoría</Label>
            <select value={form.category} onChange={F("category")}>
              {WOD_TYPES.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <Label>Descripción del WOD</Label>
            <textarea rows={3} placeholder="Ej: 21-15-9 Thrusters 43kg / Pull-ups" value={form.description} onChange={F("description")} style={{ resize: "vertical" }} />
          </div>
          <div>
            <Label>Resultado</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Ej: 7:32 o 12 rondas" value={form.result} onChange={F("result")} />
              <select value={form.resultUnit} onChange={F("resultUnit")} style={{ width: 100 }}>
                {["min", "seg", "rondas", "reps"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => FB("rx")(!form.rx)} style={{ width: 40, height: 24, borderRadius: 12, background: form.rx ? COLORS.green : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all .2s" }}>
              <span style={{ position: "absolute", top: 3, left: form.rx ? 18 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: 14, color: form.rx ? COLORS.green : COLORS.muted, fontWeight: 600 }}>RX {form.rx ? "✓" : ""}</span>
          </div>
        </>}

        {type === "Levantamiento" && <>
          <div>
            <Label>Movimiento</Label>
            <select value={form.movement} onChange={F("movement")}>
              {MOVEMENTS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Peso (1RM o máximo)</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" placeholder="100" value={form.weight} onChange={F("weight")} />
              <select value={form.weightUnit} onChange={F("weightUnit")} style={{ width: 80 }}>
                {["kg", "lb"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Series x Reps (opcional)</Label>
            <input placeholder="Ej: 5x3, 3x1" value={form.reps} onChange={F("reps")} />
          </div>
        </>}

        {type === "Benchmark" && <>
          <div>
            <Label>Benchmark</Label>
            <select value={form.benchmark} onChange={F("benchmark")}>
              {BENCHMARKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <Label>Resultado</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Ej: 3:02" value={form.result} onChange={F("result")} />
              <select value={form.resultUnit} onChange={F("resultUnit")} style={{ width: 100 }}>
                {["min", "seg", "rondas", "reps"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => FB("rx")(!form.rx)} style={{ width: 40, height: 24, borderRadius: 12, background: form.rx ? COLORS.green : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all .2s" }}>
              <span style={{ position: "absolute", top: 3, left: form.rx ? 18 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: 14, color: form.rx ? COLORS.green : COLORS.muted, fontWeight: 600 }}>RX {form.rx ? "✓" : ""}</span>
          </div>
        </>}

        {type === "Skill" && <>
          <div>
            <Label>Habilidad</Label>
            <select value={form.skill} onChange={F("skill")}>
              {SKILLS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Nivel</Label>
            <select value={form.skillLevel} onChange={F("skillLevel")}>
              {["Logrado", "En progreso", "Primera vez", "PR nuevo"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </>}

        {/* Common */}
        <div>
          <Label>Sensación ({form.rating}/5)</Label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => FB("rating")(n)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", opacity: n <= form.rating ? 1 : .3, filter: n <= form.rating ? "none" : "grayscale(1)" }}>🔥</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <textarea rows={2} placeholder="Notas, sensaciones, escalado..." value={form.notes} onChange={F("notes")} style={{ resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn onClick={handleSave}>💾 Guardar</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ s, onDelete }) {
  const typeColor = { WOD: COLORS.accent, Levantamiento: COLORS.gold, Benchmark: COLORS.blue, Skill: COLORS.green };
  const c = typeColor[s.type] || COLORS.accent;

  const mainInfo = () => {
    if (s.type === "WOD") return `${s.category} · ${s.result ? s.result + " " + s.resultUnit : "—"}${s.rx ? " · RX" : ""}`;
    if (s.type === "Levantamiento") return `${s.movement} · ${s.weight || "—"} ${s.weightUnit}`;
    if (s.type === "Benchmark") return `${s.benchmark} · ${s.result ? s.result + " " + s.resultUnit : "—"}${s.rx ? " · RX" : ""}`;
    if (s.type === "Skill") return `${s.skill} · ${s.skillLevel}`;
    return "";
  };

  return (
    <div className="fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${c}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <Badge label={s.type} color={c} />
          <span style={{ fontSize: 13, color: COLORS.muted }}>{formatDate(s.date)}</span>
          {s.rating && <span style={{ fontSize: 13 }}>{"🔥".repeat(s.rating)}</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text, marginBottom: s.description || s.notes ? 4 : 0 }}>{mainInfo()}</div>
        {s.description && <div style={{ fontSize: 13, color: COLORS.muted }}>{s.description}</div>}
        {s.notes && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: "italic" }}>{s.notes}</div>}
      </div>
      <Btn variant="danger" onClick={onDelete} style={{ padding: "6px 10px", fontSize: 12, flexShrink: 0 }}>✕</Btn>
    </div>
  );
}

// ── Stats / Summary ───────────────────────────────────────────────────────────
function StatsView({ sessions }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState("monthly"); // monthly | annual

  const yearSessions = sessions.filter(s => new Date(s.date).getFullYear() === year);
  const monthSessions = yearSessions.filter(s => new Date(s.date).getMonth() === month);

  const target = view === "monthly" ? monthSessions : yearSessions;

  const byType = (arr) => {
    const m = {};
    arr.forEach(s => { m[s.type] = (m[s.type] || 0) + 1; });
    return m;
  };

  const monthlyCount = MONTHS.map((_, i) => yearSessions.filter(s => new Date(s.date).getMonth() === i).length);
  const maxBar = Math.max(...monthlyCount, 1);

  const rxCount = target.filter(s => s.rx).length;
  const rxPct = target.length ? Math.round(rxCount / target.filter(s => s.type === "WOD" || s.type === "Benchmark").length * 100) || 0 : 0;

  // PRs per lift
  const liftPRs = {};
  sessions.filter(s => s.type === "Levantamiento" && s.weight).sort((a,b) => new Date(a.date)-new Date(b.date)).forEach(s => {
    const w = parseFloat(s.weight);
    if (!liftPRs[s.movement] || w > liftPRs[s.movement].weight) liftPRs[s.movement] = { weight: w, unit: s.weightUnit, date: s.date };
  });

  const types = byType(target);
  const typeColor = { WOD: COLORS.accent, Levantamiento: COLORS.gold, Benchmark: COLORS.blue, Skill: COLORS.green };

  const availableYears = [...new Set(sessions.map(s => new Date(s.date).getFullYear()))].sort((a,b)=>b-a);
  if (!availableYears.includes(year) && availableYears.length) setYear(availableYears[0]);

  return (
    <div className="fade-in">
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 4, border: `1px solid ${COLORS.border}` }}>
          {["monthly","annual"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: view===v ? COLORS.accent : "transparent", color: view===v ? "#fff" : COLORS.muted, border:"none", cursor:"pointer", transition:"all .2s" }}>
              {v === "monthly" ? "Mensual" : "Anual"}
            </button>
          ))}
        </div>
        <select value={year} onChange={e=>setYear(+e.target.value)} style={{ width: 90 }}>
          {(availableYears.length ? availableYears : [now.getFullYear()]).map(y=><option key={y}>{y}</option>)}
        </select>
        {view==="monthly" && (
          <select value={month} onChange={e=>setMonth(+e.target.value)} style={{ width: 130 }}>
            {FULL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:20 }}>
        <StatBox label="Entrenos" value={target.length} color={COLORS.accent} />
        <StatBox label="WODs" value={types.WOD||0} color={COLORS.accent} />
        <StatBox label="Levant." value={types.Levantamiento||0} color={COLORS.gold} />
        <StatBox label="Benchmarks" value={types.Benchmark||0} color={COLORS.blue} />
        <StatBox label="Skills" value={types.Skill||0} color={COLORS.green} />
        <StatBox label="% RX" value={rxPct+"%"} color={COLORS.green} sub="sobre WODs/Bench" />
      </div>

      {/* Annual bar chart */}
      {view === "annual" && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: COLORS.text }}>Entrenos por mes — {year}</div>
          <div style={{ display:"flex", gap:6, alignItems:"flex-end", height: 100 }}>
            {MONTHS.map((m,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:10, color: COLORS.muted }}>{monthlyCount[i]||""}</div>
                <div style={{ width:"100%", background: i===month ? COLORS.accent : COLORS.accentDim, borderRadius:"4px 4px 0 0", height: `${(monthlyCount[i]/maxBar)*80+4}px`, transition:"height .3s", cursor:"pointer" }} onClick={()=>{setMonth(i);setView("monthly");}} />
                <div style={{ fontSize:10, color: COLORS.muted }}>{m}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lift PRs */}
      {Object.keys(liftPRs).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: COLORS.text }}>🏆 Récords personales (PRs)</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Object.entries(liftPRs).map(([mov, pr]) => (
              <div key={mov} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${COLORS.border}`, paddingBottom:8 }}>
                <span style={{ fontWeight:600, color: COLORS.text }}>{mov}</span>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontFamily:"'Bebas Neue'", fontSize:22, color: COLORS.gold }}>{pr.weight} {pr.unit}</span>
                  <span style={{ fontSize:12, color: COLORS.muted }}>{formatDate(pr.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Benchmark history */}
      {sessions.filter(s=>s.type==="Benchmark").length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, color: COLORS.text }}>⏱ Mejores tiempos Benchmarks</div>
          {(() => {
            const bests = {};
            sessions.filter(s=>s.type==="Benchmark"&&s.result).sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(s=>{
              if (!bests[s.benchmark]) bests[s.benchmark] = s;
            });
            return Object.entries(bests).map(([b, s]) => (
              <div key={b} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${COLORS.border}`, paddingBottom:8, marginBottom:8 }}>
                <span style={{ fontWeight:600 }}>{b}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontFamily:"'Bebas Neue'", fontSize:20, color: COLORS.blue }}>{s.result} {s.resultUnit}</span>
                  {s.rx && <Badge label="RX" color={COLORS.green} />}
                  <span style={{ fontSize:12, color: COLORS.muted }}>{formatDate(s.date)}</span>
                </div>
              </div>
            ));
          })()}
        </Card>
      )}

      {target.length === 0 && (
        <div style={{ textAlign:"center", color: COLORS.muted, padding: 40 }}>
          No hay entrenos en este período. ¡Empieza a registrar!
        </div>
      )}
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────────────
function HistoryView({ sessions, onDelete }) {
  const [filter, setFilter] = useState("Todos");
  const types = ["Todos", "WOD", "Levantamiento", "Benchmark", "Skill"];
  const visible = (filter === "Todos" ? sessions : sessions.filter(s => s.type === filter))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fade-in">
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding:"7px 14px", borderRadius:20, fontWeight:600, fontSize:13, background: filter===t ? COLORS.accent : COLORS.surface, color: filter===t ? "#fff" : COLORS.muted, border:`1px solid ${filter===t ? COLORS.accent : COLORS.border}`, cursor:"pointer", transition:"all .2s" }}>{t}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visible.length === 0
          ? <div style={{ textAlign:"center", color: COLORS.muted, padding:40 }}>No hay registros aún.</div>
          : visible.map(s => <SessionCard key={s.id} s={s} onDelete={() => onDelete(s.id)} />)
        }
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => load(KEYS.current));
  const [tab, setTab] = useState("dashboard");
  const [logging, setLogging] = useState(false);
  const [sessions, setSessions] = useState([]);

  // Inject CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const loadSessions = useCallback(() => {
    if (!user) return;
    const all = load(KEYS.sessions) || [];
    setSessions(all.filter(s => s.userId === user.username));
  }, [user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleLogin = (u) => { save(KEYS.current, u); setUser(u); };
  const handleLogout = () => { save(KEYS.current, null); setUser(null); setSessions([]); };

  const handleDelete = (id) => {
    const all = (load(KEYS.sessions) || []).filter(s => s.id !== id);
    save(KEYS.sessions, all);
    loadSessions();
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const NAV = [
    { id:"dashboard", label:"📊 Inicio" },
    { id:"history",   label:"📋 Historial" },
    { id:"stats",     label:"📈 Estadísticas" },
  ];

  const recentSessions = sessions.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  const thisWeek = sessions.filter(s => {
    const d = new Date(s.date); const now = new Date();
    const diff = (now - d) / (1000*60*60*24);
    return diff <= 7;
  }).length;
  const thisMonth = sessions.filter(s => {
    const d = new Date(s.date); const now = new Date();
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).length;

  return (
    <div style={{ background: COLORS.bg, minHeight:"100vh", color: COLORS.text }}>
      {/* Header */}
      <div style={{ background: COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, padding:"0 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:800, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, letterSpacing:2, color: COLORS.accent }}>WODLOG</div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:13, color: COLORS.muted, display:"none" }} className="desktop-only">Hola, {user.name}</span>
            <Btn onClick={() => { setLogging(true); setTab("log"); }} style={{ padding:"8px 16px", fontSize:13, animation: "pulse 2s infinite" }}>+ Entreno</Btn>
            <button onClick={handleLogout} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"7px 12px", color: COLORS.muted, fontSize:13, cursor:"pointer" }}>Salir</button>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      {!logging && (
        <div style={{ background: COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
          <div style={{ maxWidth:800, margin:"0 auto", display:"flex" }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ padding:"14px 20px", fontWeight:600, fontSize:14, background:"transparent", border:"none", borderBottom:`2px solid ${tab===n.id ? COLORS.accent : "transparent"}`, color: tab===n.id ? COLORS.accent : COLORS.muted, cursor:"pointer", transition:"all .2s" }}>{n.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 16px" }}>
        {logging ? (
          <LogWorkout user={user} onSave={() => { loadSessions(); setLogging(false); setTab("history"); }} onCancel={() => { setLogging(false); }} />
        ) : tab === "dashboard" ? (
          <div className="fade-in">
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:36, letterSpacing:1, color: COLORS.text }}>Hola, {user.name.split(" ")[0]} 👋</div>
              <div style={{ color: COLORS.muted, fontSize:14 }}>{new Date().toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" })}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
              <StatBox label="Esta semana" value={thisWeek} />
              <StatBox label="Este mes" value={thisMonth} color={COLORS.blue} />
              <StatBox label="Total" value={sessions.length} color={COLORS.gold} />
            </div>
            <div style={{ marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:16 }}>Últimos entrenos</div>
              {sessions.length > 0 && <button onClick={()=>setTab("history")} style={{ background:"none", border:"none", color: COLORS.accent, fontSize:13, cursor:"pointer", fontWeight:600 }}>Ver todos →</button>}
            </div>
            {recentSessions.length === 0
              ? <Card style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🏋️</div>
                  <div style={{ color: COLORS.muted, marginBottom:16 }}>Aún no tienes entrenos registrados.</div>
                  <Btn onClick={() => setLogging(true)}>Registrar primer entreno</Btn>
                </Card>
              : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {recentSessions.map(s => <SessionCard key={s.id} s={s} onDelete={() => handleDelete(s.id)} />)}
                </div>
            }
          </div>
        ) : tab === "history" ? (
          <HistoryView sessions={sessions} onDelete={handleDelete} />
        ) : tab === "stats" ? (
          <StatsView sessions={sessions} />
        ) : null}
      </div>
    </div>
  );
}
