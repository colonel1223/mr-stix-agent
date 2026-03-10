import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════
// MR. STIX — FULL DESKTOP AGENT UI
// ═══════════════════════════════════════════════════

const WS_URL = `ws://${window.location.hostname}:3118`;

function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          setMessages((prev) => [...prev.slice(-200), msg]);
        } catch (err) {}
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [url]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { messages, connected, send };
}

function StixCharacter3D({ mood }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = 280, h = 360;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(2);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x4466aa, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 1.2);
    rim.position.set(-3, 3, -2);
    scene.add(rim);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e, metalness: 0.15, roughness: 0.12,
      clearcoat: 1.0, clearcoatRoughness: 0.05,
    });
    const headMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4b896, metalness: 0.05, roughness: 0.2,
      clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color(0xffccaa),
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.05, clearcoat: 1 });
    const eyeWhiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f5e8, roughness: 0.15, clearcoat: 0.9 });
    const smirkMat = new THREE.MeshPhysicalMaterial({ color: 0x8b2020, roughness: 0.3, clearcoat: 0.6 });
    const shoeMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1a0a, metalness: 0.3, roughness: 0.15, clearcoat: 1 });

    const char = new THREE.Group();
    const headGeo = new THREE.SphereGeometry(0.48, 32, 32);
    headGeo.scale(1, 1.15, 0.95);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.15;
    char.add(head);

    const ewGeo = new THREE.SphereGeometry(0.12, 16, 16);
    ewGeo.scale(1.3, 0.7, 0.5);
    const lew = new THREE.Mesh(ewGeo, eyeWhiteMat);
    lew.position.set(-0.16, 3.22, 0.38);
    char.add(lew);
    const rew = new THREE.Mesh(ewGeo.clone(), eyeWhiteMat);
    rew.position.set(0.16, 3.22, 0.38);
    char.add(rew);

    const pGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const lp = new THREE.Mesh(pGeo, eyeMat);
    lp.position.set(-0.14, 3.2, 0.44);
    char.add(lp);
    const rp = new THREE.Mesh(pGeo.clone(), eyeMat);
    rp.position.set(0.18, 3.2, 0.44);
    char.add(rp);

    const smirkCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.18, 3.0, 0.42), new THREE.Vector3(-0.08, 2.97, 0.44),
      new THREE.Vector3(0.08, 2.97, 0.46), new THREE.Vector3(0.2, 3.04, 0.43)
    );
    const smirkTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smirkCurve.getPoints(20)), 20, 0.018, 8, false);
    char.add(new THREE.Mesh(smirkTube, smirkMat));

    const r = 0.04;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.2, 12), bodyMat);
    torso.position.y = 2.1;
    char.add(torso);

    const armG = new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.7, 10);
    const la = new THREE.Mesh(armG, bodyMat); la.position.set(-0.42, 2.45, 0); la.rotation.z = 1.2; char.add(la);
    const ra = new THREE.Mesh(armG.clone(), bodyMat); ra.position.set(0.42, 2.45, 0); ra.rotation.z = -1.2; char.add(ra);

    const legG = new THREE.CylinderGeometry(r, r, 0.8, 12);
    const ll = new THREE.Mesh(legG, bodyMat); ll.position.set(-0.18, 1.15, 0); ll.rotation.z = 0.15; char.add(ll);
    const rl = new THREE.Mesh(legG.clone(), bodyMat); rl.position.set(0.18, 1.15, 0); rl.rotation.z = -0.15; char.add(rl);

    const sGeo = new THREE.SphereGeometry(0.08, 12, 8); sGeo.scale(1.8, 0.5, 1.1);
    const ls = new THREE.Mesh(sGeo, shoeMat); ls.position.set(-0.24, 0.16, 0.02); char.add(ls);
    const rs = new THREE.Mesh(sGeo.clone(), shoeMat); rs.position.set(0.24, 0.16, 0.02); char.add(rs);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.25 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    char.add(shadow);
    scene.add(char);

    let t = 0, af;
    const animate = () => {
      af = requestAnimationFrame(animate);
      t += 0.025;
      char.rotation.y = Math.sin(t * 0.7) * 0.08;
      head.rotation.z = Math.sin(t * 0.5) * 0.04;
      const walk = Math.sin(t * 3) * 0.25;
      ll.rotation.x = walk; rl.rotation.x = -walk;
      la.rotation.x = -walk * 0.6; ra.rotation.x = walk * 0.6;
      lp.position.x = -0.14 + Math.sin(t * 0.2) * 0.015;
      rp.position.x = 0.18 + Math.sin(t * 0.2) * 0.015;
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(af); renderer.dispose(); };
  }, []);

  return <div ref={mountRef} />;
}

function LogEntry({ msg }) {
  const typeColors = {
    "thought": "#88ccff",
    "tool:call": "#cc88ff",
    "tool:result": "#88ff88",
    "tool:error": "#ff6666",
    "task:start": "#ffcc44",
    "task:complete": "#44ff88",
    "iteration": "#666688",
  };

  const color = typeColors[msg.type] || "#888";
  const text = msg.data?.text || msg.data?.tool || msg.data?.task || msg.message || msg.type;

  return (
    <div style={{ padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 11, lineHeight: 1.5 }}>
      <span style={{ color: "#555", marginRight: 6, fontFamily: "monospace", fontSize: 9 }}>
        {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false })}
      </span>
      <span style={{ color, fontWeight: msg.type === "thought" ? "normal" : "bold", fontFamily: "monospace", fontSize: 10 }}>
        [{msg.type}]
      </span>
      <span style={{ color: "#ccc", marginLeft: 6 }}>
        {typeof text === "string" ? text.slice(0, 200) : JSON.stringify(text).slice(0, 200)}
      </span>
    </div>
  );
}

export default function StixApp() {
  const { messages, connected, send } = useWebSocket(WS_URL);
  const [task, setTask] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.type === "task:complete" || last?.type === "task:error") setIsRunning(false);
    if (last?.type === "task:start") setIsRunning(true);
  }, [messages]);

  const submitTask = () => {
    if (!task.trim() || isRunning) return;
    send({ type: "task", task: task.trim() });
    setTask("");
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(180deg, #08080f 0%, #0f0f1a 40%, #141428 100%)",
      display: "flex", fontFamily: "'Segoe UI', Tahoma, sans-serif", color: "#ccc", overflow: "hidden",
    }}>
      {/* Left panel - Mr. Stix */}
      <div style={{
        width: 320, display: "flex", flexDirection: "column", alignItems: "center",
        borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 10px",
      }}>
        <div style={{
          background: "linear-gradient(90deg, #0a246a, #3a6ea5, #0a246a)",
          padding: "3px 10px", width: "100%", borderRadius: "4px 4px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#44ff44" : "#ff4444", boxShadow: `0 0 6px ${connected ? "#44ff44" : "#ff4444"}` }} />
            <span style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>Mr. Stix Agent</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>v1.0</span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderTop: 0, width: "100%", display: "flex", justifyContent: "center" }}>
          <StixCharacter3D mood={isRunning ? "working" : "idle"} />
        </div>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#556", letterSpacing: 1 }}>STATUS</div>
          <div style={{
            fontSize: 12, fontWeight: "bold", marginTop: 4,
            color: isRunning ? "#ffaa44" : connected ? "#44ff88" : "#ff4444",
          }}>
            {isRunning ? "⚡ EXECUTING" : connected ? "● READY" : "○ DISCONNECTED"}
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4, width: "100%", fontSize: 9, color: "#556", lineHeight: 1.8 }}>
          <div>Tasks completed: {messages.filter(m => m.type === "task:complete").length}</div>
          <div>Tool calls: {messages.filter(m => m.type === "tool:call").length}</div>
          <div>Errors: {messages.filter(m => m.type === "tool:error").length}</div>
        </div>
      </div>

      {/* Right panel - Task interface */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Task input */}
        <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: "#556", marginBottom: 8, letterSpacing: 1 }}>ASSIGN TASK</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTask()}
              placeholder={isRunning ? "Mr. Stix is working..." : "Tell Mr. Stix what to do..."}
              disabled={isRunning}
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4, padding: "10px 14px", color: "#ddd", fontSize: 13,
                outline: "none", fontFamily: "inherit",
              }}
            />
            <button
              onClick={submitTask}
              disabled={isRunning || !task.trim()}
              style={{
                background: isRunning ? "#333" : "linear-gradient(180deg, #2a5a8a, #1a3a5a)",
                border: "1px solid #3a6a9a", borderRadius: 4, color: "white",
                padding: "10px 20px", cursor: isRunning ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: "bold", letterSpacing: 0.5,
              }}
            >
              {isRunning ? "Working..." : "Execute"}
            </button>
          </div>
        </div>

        {/* Live log */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", fontSize: 10, color: "#556", letterSpacing: 1, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            LIVE AGENT LOG
          </div>
          <div ref={logRef} style={{
            flex: 1, overflowY: "auto", padding: "8px 16px",
            fontFamily: "'Cascadia Code', 'Fira Code', monospace",
          }}>
            {messages.length === 0 ? (
              <div style={{ color: "#333", fontSize: 12, marginTop: 40, textAlign: "center" }}>
                Waiting for tasks... Mr. Stix is patient. For now.
              </div>
            ) : (
              messages.map((msg, i) => <LogEntry key={i} msg={msg} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
