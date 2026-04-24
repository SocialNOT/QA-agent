import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./src/lib/db.ts";
import crypto from "crypto";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "forensics-secret-key-12345";
const ADMIN_USER = (
  process.env.Admin_User_Name || 
  process.env.ADMIN_USER_NAME || 
  process.env.VITE_ADMIN_USERNAME || 
  "admin"
).trim();

const ADMIN_PASS = (
  process.env.Admin_Password || 
  process.env.ADMIN_PASSWORD || 
  process.env.VITE_ADMIN_PASSWORD || 
  "admin123"
).trim();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
};

// API routes
app.post("/api/login", async (req, res) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  const username = rawUsername?.trim();
  const password = rawPassword?.trim();
  
  // Normalize for comparison
  const normalizedAttempt = username?.toLowerCase();
  const normalizedAdmin = ADMIN_USER.toLowerCase();

  console.log(`[AUTH] Login attempt: "${username}" (normalized: "${normalizedAttempt}")`);
  console.log(`[AUTH] Admin expected: "${ADMIN_USER}" (normalized: "${normalizedAdmin}")`);
  
  // Check Root Admin (case-insensitive for username, exact for password)
  if (normalizedAttempt === normalizedAdmin && password === ADMIN_PASS) {
    console.log(`[AUTH] Root admin login SUCCESS for: "${username}"`);
    const token = jwt.sign({ id: "root-admin", username: ADMIN_USER, role: "admin", department_id: null }, JWT_SECRET);
    return res.json({ 
      token, 
      user: { id: "root-admin", username: ADMIN_USER, role: "admin", is_verified: true, department_id: null } 
    });
  }

  console.log(`[AUTH] Root admin match FAILED. Checking database...`);

  // Check SQLite DB
  try {
    // Database usernames are also checked case-insensitively via SQL COLLATE NOCASE or lower()
    const user = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username) as any;
    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.is_verified) {
      console.log(`[AUTH] User not verified: ${username}`);
      return res.status(403).json({ error: "Account pending admin approval" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`[AUTH] Invalid password for: ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, department_id: user.department_id }, JWT_SECRET);
    
    // Fetch department config if user has a department
    let department = null;
    if (user.department_id) {
      department = db.prepare("SELECT * FROM departments WHERE id = ?").get(user.department_id) as any;
      if (department) {
        department.config = JSON.parse(department.config_json);
      }
    }

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        is_verified: true, 
        department_id: user.department_id,
        department 
      } 
    });
  } catch (err) {
    console.error(`[AUTH] Database error during login:`, err);
    res.status(500).json({ error: "Internal server authentication error" });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, password, department_id } = req.body;
  console.log(`[AUTH] Registration request: ${username}`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    db.prepare("INSERT INTO users (id, username, password, role, is_verified, department_id) VALUES (?, ?, ?, ?, 0, ?)")
      .run(id, username, hashedPassword, "user", department_id || null);
    
    res.json({ success: true, message: "Registration successful. Pending admin approval." });
  } catch (err) {
    console.error(`[AUTH] Registration failed:`, err);
    res.status(400).json({ error: "Username already exists or invalid data" });
  }
});

// Department Routes
app.get("/api/departments", authenticate, (req, res) => {
  try {
    const depts = db.prepare("SELECT * FROM departments").all() as any[];
    const formattedDepts = depts.map(d => ({
      ...d,
      config: JSON.parse(d.config_json)
    }));
    res.json(formattedDepts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

app.post("/api/departments", authenticate, isAdmin, (req, res) => {
  const { name, config } = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare("INSERT INTO departments (id, name, config_json) VALUES (?, ?, ?)")
      .run(id, name, JSON.stringify(config));
    res.json({ id, name, config });
  } catch (err) {
    res.status(400).json({ error: "Department name already exists" });
  }
});

app.put("/api/departments/:id", authenticate, isAdmin, (req, res) => {
  const { name, config } = req.body;
  try {
    db.prepare("UPDATE departments SET name = ?, config_json = ? WHERE id = ?")
      .run(name, JSON.stringify(config), req.params.id);
    res.json({ id: req.params.id, name, config });
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete("/api/departments/:id", authenticate, isAdmin, (req, res) => {
  try {
    db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete department" });
  }
});

app.get("/api/users", authenticate, isAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_verified, u.department_id, u.created_at, d.name as department_name 
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
  `).all();
  res.json(users);
});

// System Settings Routes
app.get("/api/settings/gemini-key", authenticate, (req, res) => {
  try {
    const setting = db.prepare("SELECT value FROM system_settings WHERE key = ?").get("gemini_api_key") as any;
    res.json({ key: setting?.value || process.env.GEMINI_API_KEY || "" });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings/gemini-key", authenticate, isAdmin, (req, res) => {
  const { key } = req.body;
  try {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)")
      .run("gemini_api_key", key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.post("/api/users", authenticate, isAdmin, async (req, res) => {
  const { username, password, role, department_id } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  try {
    db.prepare("INSERT INTO users (id, username, password, role, is_verified, department_id) VALUES (?, ?, ?, ?, 1, ?)")
      .run(id, username, hashedPassword, role || "user", department_id || null);
    res.json({ id, username, role: role || "user", is_verified: true, department_id });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.patch("/api/users/:id/verify", authenticate, isAdmin, (req, res) => {
  try {
    db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify user" });
  }
});

app.delete("/api/users/:id", authenticate, isAdmin, (req, res) => {
  if (req.params.id === 'root-admin') return res.status(403).json({ error: "Cannot delete root admin" });
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/calls", authenticate, (req: any, res) => {
  try {
    let calls;
    if (req.user.role === "admin") {
      calls = db.prepare(`
        SELECT c.*, u.username as agent_name, d.name as department_name 
        FROM calls c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        ORDER BY c.created_at DESC
      `).all();
    } else {
      calls = db.prepare(`
        SELECT c.*, u.username as agent_name, d.name as department_name 
        FROM calls c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = ? 
        ORDER BY c.created_at DESC
      `).all(req.user.department_id);
    }
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

app.post("/api/calls", authenticate, (req: any, res) => {
  const { 
    id, file_names, duration_sec, sentiment_score, 
    risk_score, compliance_score, summary, full_result_json 
  } = req.body;

  try {
    // Get user's department
    const user = db.prepare("SELECT department_id FROM users WHERE id = ?").get(req.user.id) as any;
    const department_id = user?.department_id || null;

    db.prepare(`
      INSERT INTO calls (
        id, file_names, duration_sec, sentiment_score, 
        risk_score, compliance_score, summary, full_result_json, created_by, department_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, JSON.stringify(file_names), duration_sec, sentiment_score,
      risk_score, compliance_score, summary, full_result_json, req.user.id, department_id
    );
    res.json({ success: true });
  } catch (err) {
    console.error(`[API] Call save failed:`, err);
    res.status(500).json({ error: "Failed to save record" });
  }
});

app.delete("/api/calls/:id", authenticate, (req: any, res) => {
  try {
    if (req.user.role === "admin") {
      db.prepare("DELETE FROM calls WHERE id = ?").run(req.params.id);
    } else {
      db.prepare("DELETE FROM calls WHERE id = ? AND created_by = ?").run(req.params.id, req.user.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete record" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Call Forensics Gateway is active" });
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving static files from ${distPath}`);
    app.use(express.static(distPath));
    
    // Catch-all route for SPA - updated for Express 5 compatibility
    app.get("*all", (req, res, next) => {
      // Don't intercept API calls that weren't caught by API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send(err.message);
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Admin Check: USER_SET=${!!ADMIN_USER}, USER_LEN=${ADMIN_USER?.length}, PASS_SET=${!!ADMIN_PASS}, PASS_LEN=${ADMIN_PASS?.length}`);
  });
}

// Only start the server if not running on Vercel
if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
  startServer().catch(err => {
    console.error("CRITICAL: Failed to start server:", err);
    process.exit(1);
  });
}

export default app;
