#!/usr/bin/env node
/**
 * Database Backup Script
 *
 * Creates a timestamped backup of the SQLite database.
 * Can be scheduled via cron for regular backups.
 *
 * Usage: npx ts-node scripts/backup-db.ts
 */

import fs from 'fs';
import path from 'path';
import { config } from '../src/config';

const dbPath = config.database.connection.filename;
const backupDir = path.join(path.dirname(dbPath), 'backups');

function backupDatabase(): void {
  console.log('💾 Starting database backup...');
  console.log(`📁 Source: ${dbPath}`);
  console.log(`📁 Backup directory: ${backupDir}`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✅ Created backup directory`);
  }

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at: ${dbPath}`);
    process.exit(1);
  }

  // Create timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `app-backup-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFilename);

  // Copy database file
  try {
    fs.copyFileSync(dbPath, backupPath);
    const stats = fs.statSync(backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`📦 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`❌ Backup failed:`, error);
    process.exit(1);
  }

  // Clean up old backups (keep last 30 days)
  cleanupOldBackups();
}

function cleanupOldBackups(): void {
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('app-backup-') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Newest first

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  let deleted = 0;

  for (const file of files) {
    if (file.time < thirtyDaysAgo) {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
        deleted++;
      } catch (error) {
        console.error(`❌ Failed to delete ${file.name}:`, error);
      }
    }
  }

  if (deleted > 0) {
    console.log(`✅ Cleaned up ${deleted} old backup(s)`);
  } else {
    console.log(`✅ No old backups to clean up`);
  }
}

// Run if executed directly
if (require.main === module) {
  backupDatabase();
}

export { backupDatabase };