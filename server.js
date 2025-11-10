// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const vm = require("vm");


const app = express();
const PORT = process.env.PORT || 5000;


// (optional) lazy-loaded TypeScript
let ts = null;


// ---------- Middleware ----------
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.json({ limit: "1mb" }));


// ---------- Root: Split-View Dashboard ----------
app.get("/", (req, res) => {
  res.send(`
<html>
  <head>
    <meta charset="utf-8" />
    <title>⚡ JS/TS Playground</title>
    <link rel="stylesheet" href="/assets/style.css" />
  </head>
  <body>
    <div id="container">
      <div id="sidebar">
        <h2>📂 Files</h2>
        <ul id="fileList"></ul>
      </div>


      <div id="main">
        <div id="toolbar">
          <button id="runBtn" disabled>▶ Run</button>
          <button id="saveBtn" disabled>💾 Save</button>
          <span id="status"></span>
        </div>
        <textarea id="editor" placeholder="Select a file to view/edit..."></textarea>
        <pre id="result">(select a file and click ▶ Run)</pre>
      </div>
    </div>


    <script>
      let currentLang = null;
      let currentFile = null;


      async function loadFiles() {
        const res = await fetch('/api/list');
        const files = await res.json();
        const list = document.getElementById('fileList');
        list.innerHTML = '';
        for (const group of files) {
          const heading = document.createElement('h3');
          heading.textContent = group.folder.toUpperCase();
          list.appendChild(heading);
          group.files.forEach(f => {
            const li = document.createElement('li');
            li.textContent = f;
            li.onclick = () => openFile(group.folder, f);
            list.appendChild(li);
          });
        }
      }


      async function openFile(lang, file) {
        const res = await fetch('/api/file/' + lang + '/' + file);
        const text = await res.text();
        document.getElementById('editor').value = text;
        document.getElementById('result').textContent = '';
        document.getElementById('runBtn').disabled = false;
        document.getElementById('saveBtn').disabled = false;
        currentLang = lang;
        currentFile = file;
        document.getElementById('status').textContent = '📝 Editing: ' + file;
      }


      async function runFile() {
        const editor = document.getElementById("editor");
        const result = document.getElementById("result");
        result.textContent = "⏳ Running...";


        const payload = {
          lang: currentLang || "js",
          code: editor.value || ""
        };


        try {
          const res = await fetch("/api/runTemp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });


          const text = await res.text();
          result.textContent = text || "(no output)";
        } catch (err) {
          result.textContent = "⚠️ Request failed: " + err.message;
        }
      }


      async function saveFile() {
        const code = document.getElementById('editor').value;
        const res = await fetch('/api/save/' + currentLang + '/' + currentFile, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        document.getElementById('status').textContent = data.message;
      }


      document.getElementById('runBtn').onclick = runFile;
      document.getElementById('saveBtn').onclick = saveFile;


      loadFiles();
    </script>
  </body>
</html>
  `);
});


// ---------- API: List files ----------
app.get("/api/list", (req, res) => {
  const folders = ["js", "ts"];
  const results = folders.map(folder => {
    const dir = path.join(__dirname, folder);
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter(f => /\.(js|ts)$/i.test(f))
      : [];
    return { folder, files };
  });
  res.json(results);
});


// ---------- API: Read file ----------
app.get("/api/file/:lang/:file", (req, res) => {
  const { lang, file } = req.params;
  const filePath = path.join(__dirname, lang, file);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");
  const content = fs.readFileSync(filePath, "utf8");
  res.type("text/plain").send(content);
});


// ---------- API: Save edits ----------
app.post("/api/save/:lang/:file", (req, res) => {
  const { lang, file } = req.params;
  const { code } = req.body || {};
  const filePath = path.join(__dirname, lang, file);
  fs.writeFileSync(filePath, code ?? "", "utf8");
  res.json({ message: "✅ File saved successfully." });
});


// ---------- API: Run (in-process, no child process) ----------
app.post("/api/runTemp", (req, res) => {
  const { lang = "js", code = "" } = req.body || {};


  // capture console output
  let output = "";
  const sandbox = {
    console: {
      log: (...args) => { output += args.join(" ") + "\\n"; },
      error: (...args) => { output += args.join(" ") + "\\n"; }
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.createContext(sandbox);


  try {
    let runnable = code;


    if (lang === "ts") {
      // transpile TS on the fly (no ts-node required)
      if (!ts) {
        try { ts = require("typescript"); }
        catch {
          return res
            .status(400)
            .type("text/plain")
            .send("TypeScript requested but 'typescript' is not installed. Run: npm i typescript");
        }
      }
      const out = ts.transpileModule(code, {
        compilerOptions: { target: "ES2020", module: "CommonJS" }
      });
      runnable = out.outputText;
    }


    vm.runInContext(runnable, sandbox, { timeout: 1500 });
    res.type("text/plain").send((output && output.trim()) ? output.trim() : "(no output)");
  } catch (err) {
    const msg = err && err.stack ? err.stack : String(err);
    res.status(200).type("text/plain").send(msg);
  }
});


// ---------- (Optional) Echo & Health ----------
app.post("/api/echo", (req, res) => res.json({ ok: true, got: req.body }));
app.get("/healthz", (_req, res) => res.send("ok"));


// ---------- Start ----------
app.listen(PORT, () =>
  console.log(`🚀 Playground+Editor running at http://localhost:${PORT}`)
);






