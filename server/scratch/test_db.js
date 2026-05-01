const { Client } = require('pg');
const passwords = ['haheatal3#', 'Haheatal3#', 'postgres', '', 'admin', 'root'];
async function test() {
  for (const pw of passwords) {
    const client = new Client({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: pw,
      database: 'postgres'
    });
    try {
      await client.connect();
      console.log(`SUCCESS: Password is "${pw}"`);
      await client.end();
      return;
    } catch (e) {
      console.log(`FAILED: "${pw}" - ${e.message}`);
    }
  }
  console.log('All attempts failed.');
}
test();
