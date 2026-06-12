import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const COLORS = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3e",
  accent: "#ff4d1c", accentDim: "#ff4d1c33", gold: "#f5a623",
  text: "#f0f0f8", muted: "#7070a0", green: "#00e5a0", blue: "#4d9fff",
};

const WOD_TYPES = ["AMRAP", "For Time", "EMOM", "Chipper", "Benchmark", "Strength", "Skill", "Hero WOD"];
const MOVEMENTS = ["Snatch", "Power Snatch", "Clean & Jerk", "Clean", "Squat Clean", "Hang Power Clean", "Hang Squat Clean", "Deadlift", "Back Squat", "Front Squat", "Overhead Squat", "Press", "Push Press", "Thruster"];
const BENCHMARKS = ["Fran", "Grace", "Helen", "Cindy", "Murph", "Annie", "Barbara", "Chelsea", "Elizabeth", "Jackie", "Karen", "Kelly", "Nancy", "Amanda"];
const SKILLS = ["Muscle-up (rings)", "Muscle-up (bar)", "Handstand walk", "Handstand push-up", "Double-unders", "Pistol squat", "Rope climb", "Toes-to-bar", "Kipping pull-up", "Butterfly pull-up", "Pull-up", "Wall ball", "Burpees", "Box jump", "Air squat", "Sit-ups"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const FULL_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatDate(d) { const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
// Keep Supabase alive

// Security helpers
function hashPassword(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) + hash) ^ str.charCodeAt(i); hash = hash >>> 0; }
  return hash.toString(16).padStart(8, "0") + str.length.toString(16);
}
const loginAttempts = {};
function checkLoginAttempts(username) {
  const now = Date.now();
  if (!loginAttempts[username]) return { blocked: false, remaining: 5 };
  const { count, firstAttempt, blockedUntil } = loginAttempts[username];
  if (blockedUntil && now < blockedUntil) { return { blocked: true, secs: Math.ceil((blockedUntil - now) / 1000) }; }
  if (now - firstAttempt > 15 * 60 * 1000) { delete loginAttempts[username]; return { blocked: false, remaining: 5 }; }
  return { blocked: false, remaining: Math.max(0, 5 - count) };
}
function recordFailedAttempt(username) {
  const now = Date.now();
  if (!loginAttempts[username]) loginAttempts[username] = { count: 0, firstAttempt: now };
  loginAttempts[username].count++;
  if (loginAttempts[username].count >= 5) loginAttempts[username].blockedUntil = now + 5 * 60 * 1000;
}
function clearLoginAttempts(username) { delete loginAttempts[username]; }
function saveSession(user) {
  const session = { ...user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  localStorage.setItem("woad-mcc_user", JSON.stringify(session));
}
function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem("wod-mcc_user"));
    if (!s) return null;
    if (s.expiresAt && Date.now() > s.expiresAt) { localStorage.removeItem("wod-mcc_user"); return null; }
    return s;
  } catch { return null; }
}

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
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = { padding: "10px 20px", fontWeight: 600, fontSize: 14, letterSpacing: ".3px", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "all .15s", ...style };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff" },
    ghost: { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` },
    danger: { background: "#ff1c1c22", color: "#ff6060", border: "1px solid #ff1c1c44" },
    green: { background: COLORS.green + "22", color: COLORS.green, border: `1px solid ${COLORS.green}44` },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}
function Card({ children, style = {} }) { return <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, ...style }}>{children}</div>; }
function Badge({ label, color = COLORS.accent }) { return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>; }
function StatBox({ label, value, sub, color = COLORS.accent }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontFamily: "'Bebas Neue'", color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function Spinner() { return <div style={{ width: 20, height: 20, border: `2px solid ${COLORS.border}`, borderTop: `2px solid ${COLORS.accent}`, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} />; }

// Auth Screen
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", password2: "", name: "", email: "", resetCode: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = (p) => {
    if (!p) return null;
    if (p.length < 6) return { label: "Muy corta", color: "#ff6060" };
    if (p.length < 10) return { label: "Aceptable", color: COLORS.gold };
    return { label: "Fuerte", color: COLORS.green };
  };
  const strength = mode === "register" ? passwordStrength(form.password) : null;

  const handleSubmit = async () => {
    setErr(""); setOk("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!form.username || !form.password || !form.name || !form.email) { setErr("Rellena todos los campos."); return; }
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) { setErr("El email no es válido."); return; }
        if (form.password.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres."); return; }
        if (form.password !== form.password2) { setErr("Las contraseñas no coinciden."); return; }
        const { data: existing } = await supabase.from("users").select("id").eq("username", form.username).maybeSingle();
        if (existing) { setErr("Ese usuario ya existe."); return; }
        const { data: existingEmail } = await supabase.from("users").select("id").eq("email", form.email).maybeSingle();
        if (existingEmail) { setErr("Ese email ya está registrado."); return; }
        const { error } = await supabase.from("users").insert({ username: form.username, password: hashPassword(form.password), name: form.name, email: form.email });
        if (error) { setErr("Error al crear cuenta: " + error.message); return; }
        onLogin({ username: form.username, name: form.name });

      } else if (mode === "login") {
        if (!form.username || !form.password) { setErr("Rellena todos los campos."); return; }
        const attempt = checkLoginAttempts(form.username);
        if (attempt.blocked) { setErr(`Demasiados intentos fallidos. Espera ${attempt.secs} segundos.`); return; }
        const { data, error } = await supabase.from("users").select("*").eq("username", form.username).eq("password", hashPassword(form.password)).maybeSingle();
        if (error || !data) {
          recordFailedAttempt(form.username);
          const a = checkLoginAttempts(form.username);
          setErr(`Usuario o contraseña incorrectos.${a.remaining > 0 ? ` Te quedan ${a.remaining} intentos.` : " Cuenta bloqueada 5 min."}`);
          return;
        }
        clearLoginAttempts(form.username);
        onLogin({ username: data.username, name: data.name });

      } else if (mode === "forgot") {
        if (!form.email) { setErr("Introduce tu email."); return; }
        const { data } = await supabase.from("users").select("*").eq("email", form.email).maybeSingle();
        if (!data) { setErr("No hay ninguna cuenta con ese email."); return; }
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
        await supabase.from("users").update({ reset_token: token, reset_expires: expires }).eq("email", form.email);
        setOk(`Tu código de recuperación es:\n\n${token.slice(0, 8).toUpperCase()}\n\nCópialo, lo necesitarás ahora. Expira en 30 minutos.`);
        setTimeout(() => setMode("reset"), 4000);

      } else if (mode === "reset") {
        if (!form.email || !form.resetCode || !form.password) { setErr("Rellena todos los campos."); return; }
        if (form.password !== form.password2) { setErr("Las contraseñas no coinciden."); return; }
        if (form.password.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres."); return; }
        const { data } = await supabase.from("users").select("*").eq("email", form.email).maybeSingle();
        if (!data) { setErr("Email no encontrado."); return; }
        if (!data.reset_token || data.reset_token.slice(0, 8).toUpperCase() !== form.resetCode.toUpperCase()) { setErr("Código incorrecto."); return; }
        if (new Date(data.reset_expires) < new Date()) { setErr("El código ha expirado. Solicita uno nuevo."); return; }
        await supabase.from("users").update({ password: hashPassword(form.password), reset_token: null, reset_expires: null }).eq("email", form.email);
        setOk("¡Contraseña cambiada! Ya puedes iniciar sesión.");
        setTimeout(() => setMode("login"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const F = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const titles = { login: "Entrar", register: "Crear cuenta", forgot: "Recuperar contraseña", reset: "Nueva contraseña" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="fade-in">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, letterSpacing: 3, color: COLORS.accent, lineHeight: 1 }}>WOD-MCC</div>
          <div style={{ color: COLORS.muted, fontSize: 13, letterSpacing: 2, marginTop: 4 }}>CROSSFIT TRACKER</div>
        </div>
        <Card>
          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {["login", "register"].map(m => (
                <button key={m} onClick={() => { setMode(m); setErr(""); setOk(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 13, background: mode === m ? COLORS.accent : "transparent", color: mode === m ? "#fff" : COLORS.muted, border: "none", cursor: "pointer", transition: "all .2s" }}>
                  {m === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setMode("login"); setErr(""); setOk(""); }} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Volver</button>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 1 }}>{titles[mode]}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && <>
              <input placeholder="Nombre completo" value={form.name} onChange={F("name")} />
              <input placeholder="Email" type="email" value={form.email} onChange={F("email")} />
            </>}
            {(mode === "login" || mode === "register") && (
              <input placeholder="Usuario" value={form.username} onChange={F("username")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            )}
            {(mode === "forgot" || mode === "reset") && (
              <input placeholder="Email" type="email" value={form.email} onChange={F("email")} />
            )}
            {mode === "reset" && (
              <input placeholder="Código de recuperación" value={form.resetCode} onChange={F("resetCode")} style={{ textTransform: "uppercase", letterSpacing: 2 }} />
            )}
            {(mode === "login" || mode === "register" || mode === "reset") && <>
              <div>
                <input type="password" placeholder={mode === "reset" ? "Nueva contraseña" : "Contraseña"} value={form.password} onChange={F("password")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                {strength && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: COLORS.border }}>
                      <div style={{ height: "100%", borderRadius: 2, background: strength.color, width: form.password.length < 6 ? "33%" : form.password.length < 10 ? "66%" : "100%", transition: "all .3s" }} />
                    </div>
                    <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                )}
              </div>
              {(mode === "register" || mode === "reset") && (
                <input type="password" placeholder="Repetir contraseña" value={form.password2} onChange={F("password2")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              )}
            </>}
            {err && <div style={{ color: "#ff6060", fontSize: 13, background: "#ff000015", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            {ok && <div style={{ color: COLORS.green, fontSize: 13, background: COLORS.green + "15", borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-line" }}>{ok}</div>}
            <Btn onClick={handleSubmit} disabled={loading} style={{ marginTop: 4, padding: "12px 0", fontSize: 15 }}>
              {loading ? <Spinner /> : titles[mode]}
            </Btn>
            {mode === "login" && (
              <button onClick={() => { setMode("forgot"); setErr(""); setOk(""); }} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 13, cursor: "pointer", textAlign: "center", marginTop: 4 }}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
        </Card>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 20 }}>Datos sincronizados en todos tus dispositivos</div>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 11, marginTop: 10, letterSpacing: ".5px" }}>
          Creada por <span style={{ color: COLORS.accent, fontWeight: 600 }}>Maria Costas</span>
        </div>
      </div>
    </div>
  );
}

// Log Workout
function LogWorkout({ user, onSave, onCancel }) {
  const [type, setType] = useState("WOD");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "AMRAP", description: "", result: "", resultUnit: "min",
    movement: MOVEMENTS[0], weight: "", weightUnit: "kg", reps: "",
    benchmark: BENCHMARKS[0], skill: SKILLS[0], skillLevel: "Logrado",
    notes: "", rx: true, rating: 3,
  });
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const FB = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date) return;
    setLoading(true);
    const session = {
      id: uid(), user_id: user.username, type,
      date: form.date, category: form.category, description: form.description,
      result: form.result, result_unit: form.resultUnit, movement: form.movement,
      weight: form.weight, weight_unit: form.weightUnit, reps: form.reps,
      benchmark: form.benchmark, skill: form.skill, skill_level: form.skillLevel,
      notes: form.notes, rx: form.rx, rating: form.rating,
    };
    const { error } = await supabase.from("sessions").insert(session);
    setLoading(false);
    if (error) { alert("Error al guardar: " + error.message); return; }
    onSave();
  };

  const Label = ({ children }) => <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>{children}</div>;

  return (
    <div className="fade-in" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onCancel} style={{ padding: "8px 14px" }}>← Volver</Btn>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>Registrar entreno</h2>
      </div>
      <Card style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Label>Tipo de registro</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["WOD", "Levantamiento", "Benchmark", "Skill"].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: "8px 16px", borderRadius: 20, fontWeight: 600, fontSize: 13, background: type === t ? COLORS.accent : COLORS.surface, color: type === t ? "#fff" : COLORS.muted, border: `1px solid ${type === t ? COLORS.accent : COLORS.border}`, cursor: "pointer", transition: "all .2s" }}>{t}</button>
            ))}
          </div>
        </div>
        <div><Label>Fecha</Label><input type="date" value={form.date} onChange={F("date")} /></div>

        {type === "WOD" && <>
          <div><Label>Categoría</Label><select value={form.category} onChange={F("category")}>{WOD_TYPES.map(w => <option key={w}>{w}</option>)}</select></div>
          <div><Label>Descripción del WOD</Label><textarea rows={3} placeholder="Ej: 21-15-9 Thrusters 43kg / Pull-ups" value={form.description} onChange={F("description")} style={{ resize: "vertical" }} /></div>
          <div><Label>Resultado</Label><div style={{ display: "flex", gap: 8 }}><input placeholder="Ej: 7:32 o 12 rondas" value={form.result} onChange={F("result")} /><select value={form.resultUnit} onChange={F("resultUnit")} style={{ width: 100 }}>{["min", "seg", "rondas", "reps"].map(u => <option key={u}>{u}</option>)}</select></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => FB("rx")(!form.rx)} style={{ width: 40, height: 24, borderRadius: 12, background: form.rx ? COLORS.green : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all .2s" }}>
              <span style={{ position: "absolute", top: 3, left: form.rx ? 18 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: 14, color: form.rx ? COLORS.green : COLORS.muted, fontWeight: 600 }}>RX {form.rx ? "✓" : ""}</span>
          </div>
        </>}

        {type === "Levantamiento" && <>
          <div><Label>Movimiento</Label><select value={form.movement} onChange={F("movement")}>{MOVEMENTS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><Label>Peso (1RM o máximo)</Label><div style={{ display: "flex", gap: 8 }}><input type="number" placeholder="100" value={form.weight} onChange={F("weight")} /><select value={form.weightUnit} onChange={F("weightUnit")} style={{ width: 80 }}>{["kg", "lb"].map(u => <option key={u}>{u}</option>)}</select></div></div>
          <div><Label>Series x Reps (opcional)</Label><input placeholder="Ej: 5x3, 3x1" value={form.reps} onChange={F("reps")} /></div>
        </>}

        {type === "Benchmark" && <>
          <div><Label>Benchmark</Label><select value={form.benchmark} onChange={F("benchmark")}>{BENCHMARKS.map(b => <option key={b}>{b}</option>)}</select></div>
          <div><Label>Resultado</Label><div style={{ display: "flex", gap: 8 }}><input placeholder="Ej: 3:02" value={form.result} onChange={F("result")} /><select value={form.resultUnit} onChange={F("resultUnit")} style={{ width: 100 }}>{["min", "seg", "rondas", "reps"].map(u => <option key={u}>{u}</option>)}</select></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => FB("rx")(!form.rx)} style={{ width: 40, height: 24, borderRadius: 12, background: form.rx ? COLORS.green : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all .2s" }}>
              <span style={{ position: "absolute", top: 3, left: form.rx ? 18 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: 14, color: form.rx ? COLORS.green : COLORS.muted, fontWeight: 600 }}>RX {form.rx ? "✓" : ""}</span>
          </div>
        </>}

        {type === "Skill" && <>
          <div><Label>Habilidad</Label><select value={form.skill} onChange={F("skill")}>{SKILLS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><Label>Nivel</Label><select value={form.skillLevel} onChange={F("skillLevel")}>{["Logrado", "En progreso", "Primera vez", "PR nuevo"].map(l => <option key={l}>{l}</option>)}</select></div>
        </>}

        <div>
          <Label>Sensación ({form.rating}/5)</Label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => FB("rating")(n)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", opacity: n <= form.rating ? 1 : .3 }}>🔥</button>
            ))}
          </div>
        </div>
        <div><Label>Notas</Label><textarea rows={2} placeholder="Notas, sensaciones, escalado..." value={form.notes} onChange={F("notes")} style={{ resize: "vertical" }} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn onClick={handleSave} disabled={loading}>{loading ? <Spinner /> : "💾 Guardar"}</Btn>
        </div>
      </Card>
    </div>
  );
}

function SessionCard({ s, onDelete }) {
  const typeColor = { WOD: COLORS.accent, Levantamiento: COLORS.gold, Benchmark: COLORS.blue, Skill: COLORS.green };
  const c = typeColor[s.type] || COLORS.accent;
  const mainInfo = () => {
    if (s.type === "WOD") return `${s.category} · ${s.result ? s.result + " " + s.result_unit : "—"}${s.rx ? " · RX" : ""}`;
    if (s.type === "Levantamiento") return `${s.movement} · ${s.weight || "—"} ${s.weight_unit}`;
    if (s.type === "Benchmark") return `${s.benchmark} · ${s.result ? s.result + " " + s.result_unit : "—"}${s.rx ? " · RX" : ""}`;
    if (s.type === "Skill") return `${s.skill} · ${s.skill_level}`;
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

function StatsView({ sessions }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState("monthly");

  const yearSessions = sessions.filter(s => new Date(s.date).getFullYear() === year);
  const monthSessions = yearSessions.filter(s => new Date(s.date).getMonth() === month);
  const target = view === "monthly" ? monthSessions : yearSessions;
  const byType = arr => { const m = {}; arr.forEach(s => { m[s.type] = (m[s.type] || 0) + 1; }); return m; };
  const monthlyCount = MONTHS.map((_, i) => yearSessions.filter(s => new Date(s.date).getMonth() === i).length);
  const maxBar = Math.max(...monthlyCount, 1);
  const rxBase = target.filter(s => s.type === "WOD" || s.type === "Benchmark").length;
  const rxPct = rxBase ? Math.round(target.filter(s => s.rx).length / rxBase * 100) : 0;
  const liftPRs = {};
  sessions.filter(s => s.type === "Levantamiento" && s.weight).sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => {
    const w = parseFloat(s.weight);
    if (!liftPRs[s.movement] || w > liftPRs[s.movement].weight) liftPRs[s.movement] = { weight: w, unit: s.weight_unit, date: s.date };
  });
  const types = byType(target);
  const availableYears = [...new Set(sessions.map(s => new Date(s.date).getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 4, border: `1px solid ${COLORS.border}` }}>
          {["monthly", "annual"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: view === v ? COLORS.accent : "transparent", color: view === v ? "#fff" : COLORS.muted, border: "none", cursor: "pointer", transition: "all .2s" }}>
              {v === "monthly" ? "Mensual" : "Anual"}
            </button>
          ))}
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ width: 90 }}>
          {(availableYears.length ? availableYears : [now.getFullYear()]).map(y => <option key={y}>{y}</option>)}
        </select>
        {view === "monthly" && <select value={month} onChange={e => setMonth(+e.target.value)} style={{ width: 130 }}>{FULL_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
        <StatBox label="Entrenos" value={target.length} />
        <StatBox label="WODs" value={types.WOD || 0} />
        <StatBox label="Levant." value={types.Levantamiento || 0} color={COLORS.gold} />
        <StatBox label="Benchmarks" value={types.Benchmark || 0} color={COLORS.blue} />
        <StatBox label="Skills" value={types.Skill || 0} color={COLORS.green} />
        <StatBox label="% RX" value={rxPct + "%"} color={COLORS.green} sub="sobre WODs/Bench" />
      </div>

      {view === "annual" && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Entrenos por mes — {year}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100 }}>
            {MONTHS.map((m, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: COLORS.muted }}>{monthlyCount[i] || ""}</div>
                <div style={{ width: "100%", background: i === month ? COLORS.accent : COLORS.accentDim, borderRadius: "4px 4px 0 0", height: `${(monthlyCount[i] / maxBar) * 80 + 4}px`, transition: "height .3s", cursor: "pointer" }} onClick={() => { setMonth(i); setView("monthly"); }} />
                <div style={{ fontSize: 10, color: COLORS.muted }}>{m}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {Object.keys(liftPRs).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>🏆 Récords personales (PRs)</div>
          {Object.entries(liftPRs).map(([mov, pr]) => (
            <div key={mov} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{mov}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: COLORS.gold }}>{pr.weight} {pr.unit}</span>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{formatDate(pr.date)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {sessions.filter(s => s.type === "Benchmark").length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>⏱ Mejores tiempos Benchmarks</div>
          {(() => {
            const bests = {};
            sessions.filter(s => s.type === "Benchmark" && s.result).sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => { if (!bests[s.benchmark]) bests[s.benchmark] = s; });
            return Object.entries(bests).map(([b, s]) => (
              <div key={b} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{b}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: COLORS.blue }}>{s.result} {s.result_unit}</span>
                  {s.rx && <Badge label="RX" color={COLORS.green} />}
                  <span style={{ fontSize: 12, color: COLORS.muted }}>{formatDate(s.date)}</span>
                </div>
              </div>
            ));
          })()}
        </Card>
      )}
      {target.length === 0 && <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>No hay entrenos en este período.</div>}
    </div>
  );
}

function HistoryView({ sessions, onDelete }) {
  const [filter, setFilter] = useState("Todos");
  const visible = (filter === "Todos" ? sessions : sessions.filter(s => s.type === filter)).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["Todos", "WOD", "Levantamiento", "Benchmark", "Skill"].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: "7px 14px", borderRadius: 20, fontWeight: 600, fontSize: 13, background: filter === t ? COLORS.accent : COLORS.surface, color: filter === t ? "#fff" : COLORS.muted, border: `1px solid ${filter === t ? COLORS.accent : COLORS.border}`, cursor: "pointer", transition: "all .2s" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 ? <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>No hay registros aún.</div> : visible.map(s => <SessionCard key={s.id} s={s} onDelete={() => onDelete(s.id)} />)}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [logging, setLogging] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingApp, setLoadingApp] = useState(true);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    const saved = loadSession();
    if (saved) setUser(saved);
    setLoadingApp(false);
    return () => document.head.removeChild(style);
  }, []);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("sessions").select("*").eq("user_id", user.username).order("date", { ascending: false });
    setSessions(data || []);
  }, [user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleLogin = (u) => { saveSession(u); setUser(u); };
  const handleLogout = () => { localStorage.removeItem("wodlog_user"); setUser(null); setSessions([]); };
  const handleDelete = async (id) => { await supabase.from("sessions").delete().eq("id", id); loadSessions(); };

  if (loadingApp) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}><Spinner /></div>;
  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const NAV = [{ id: "dashboard", label: "📊 Inicio" }, { id: "history", label: "📋 Historial" }, { id: "stats", label: "📈 Estadísticas" }];
  const recentSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const thisWeek = sessions.filter(s => (new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24) <= 7).length;
  const thisMonth = sessions.filter(s => { const d = new Date(s.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: COLORS.accent }}>WOD-MCC</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Btn onClick={() => { setLogging(true); setTab("log"); }} style={{ padding: "8px 16px", fontSize: 13, animation: "pulse 2s infinite" }}>+ Entreno</Btn>
            <button onClick={handleLogout} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 12px", color: COLORS.muted, fontSize: 13, cursor: "pointer" }}>Salir</button>
          </div>
        </div>
      </div>

      {!logging && (
        <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex" }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ padding: "14px 20px", fontWeight: 600, fontSize: 14, background: "transparent", border: "none", borderBottom: `2px solid ${tab === n.id ? COLORS.accent : "transparent"}`, color: tab === n.id ? COLORS.accent : COLORS.muted, cursor: "pointer", transition: "all .2s" }}>{n.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {logging ? (
          <LogWorkout user={user} onSave={() => { loadSessions(); setLogging(false); setTab("history"); }} onCancel={() => setLogging(false)} />
        ) : tab === "dashboard" ? (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 1 }}>Hola, {user.name.split(" ")[0]} 👋</div>
              <div style={{ color: COLORS.muted, fontSize: 14 }}>{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              <StatBox label="Esta semana" value={thisWeek} />
              <StatBox label="Este mes" value={thisMonth} color={COLORS.blue} />
              <StatBox label="Total" value={sessions.length} color={COLORS.gold} />
            </div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Últimos entrenos</div>
              {sessions.length > 0 && <button onClick={() => setTab("history")} style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>}
            </div>
            {recentSessions.length === 0
              ? <Card style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
                  <div style={{ color: COLORS.muted, marginBottom: 16 }}>Aún no tienes entrenos registrados.</div>
                  <Btn onClick={() => setLogging(true)}>Registrar primer entreno</Btn>
                </Card>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
