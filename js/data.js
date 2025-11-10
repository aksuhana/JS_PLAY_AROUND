const user = {
  name: "Anil",
  role: "Full Stack Developer",
  skills: ["Node.js", "React", "TypeScript"]
};


// console.log prints to stdout (capturable)
console.log(JSON.stringify(user)); // ✅ send data out


// return will NOT be captured by parent process
return user;
