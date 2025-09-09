// Simple console logger
module.exports = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${msg}`, err || ''),
    debug: (msg) => console.log(`[DEBUG] ${msg}`)
};
