// js/basics.js

  const message = "🧠 Learning JS Basics!";
  const arr = [1, 2, 3];
  const doubled = arr.map(n => n * 2);
  const now = new Date().toLocaleTimeString();

console.log("Basics module loaded");
process.stdout.write(`h1>${message}</h1>
    <p>Array doubled: [${doubled.join(", ")}]</p>
    <p>Time: ${now}</p>`);

    process.stdout.write(JSON.stringify('\n'));
  return `
    <h1>${message}</h1>
    <p>Array doubled: [${doubled.join(", ")}]</p>
    <p>Time: ${now}</p>
  `;
