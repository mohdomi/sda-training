import { server } from './app.js';

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`capstone API on :${PORT} (db=${process.env.DB_ADAPTER || 'file'})`));
