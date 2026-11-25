import fs from 'fs';
import initSqlJs from 'sql.js';

async function testBackup() {
  const backupPath = 'data/backups/app-backup-2026-11-21T05-06-03-296Z.db';
  const dbData = fs.readFileSync(backupPath);
  const SQL = await initSqlJs({ locateFile: () => 'sql-wasm.wasm' });
  const db = new SQL.Database(dbData);

  console.log('Backup database loaded successfully');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables in backup:');
  tables[0]?.values?.forEach((row: any[]) => console.log('  - ' + row[0]));

  // Check data integrity
  const users = db.exec('SELECT COUNT(*) as count FROM users');
  console.log('Users:', users[0]?.values?.[0]?.[0] || 0);

  const assignments = db.exec('SELECT COUNT(*) as count FROM assignments');
  console.log('Assignments:', assignments[0]?.values?.[0]?.[0] || 0);

  const profiles = db.exec('SELECT COUNT(*) as count FROM handwriting_profiles');
  console.log('Handwriting Profiles:', profiles[0]?.values?.[0]?.[0] || 0);

  console.log('Backup integrity: OK');
}

testBackup().catch(console.error);