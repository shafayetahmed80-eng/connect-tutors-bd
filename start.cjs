// Startup file for hosts that load the app through Passenger (cPanel "Setup Node.js App").
// The server itself is an ES module (dist/index.js); a plain .cjs file loads it with
// import(), which works on every Node version the host may offer.
import("./dist/index.js").catch(error => {
  console.error("[startup] The server could not be loaded:", error);
  process.exit(1);
});
