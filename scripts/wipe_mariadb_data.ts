import { getMariaDbPool, isMariaDbAvailable } from '../server/db/mariaClient';

async function cleanMariaDb() {
  console.log('Checking MariaDB connection...');
  const available = await isMariaDbAvailable();
  if (!available) {
    console.log('MariaDB is not active or reachable. SQLite is primary.');
    process.exit(0);
  }

  try {
    const pool = getMariaDbPool();
    console.log('Clearing mbi_users, mbi_tenants, mbi_registered_devices in MariaDB...');
    try { await pool.query('DELETE FROM mbi_users;'); console.log('mbi_users cleared'); } catch (e) { console.log('mbi_users:', e.message); }
    try { await pool.query('DELETE FROM mbi_registered_devices;'); console.log('mbi_registered_devices cleared'); } catch (e) { console.log('mbi_registered_devices:', e.message); }
    try { await pool.query('DELETE FROM mbi_tenants;'); console.log('mbi_tenants cleared'); } catch (e) { console.log('mbi_tenants:', e.message); }
    try { await pool.query('DELETE FROM mbi_licenses;'); console.log('mbi_licenses cleared'); } catch (e) { console.log('mbi_licenses:', e.message); }
    console.log('MariaDB tables wiped successfully!');
  } catch (err) {
    console.error('MariaDB error:', err.message);
  }
  process.exit(0);
}

cleanMariaDb();
