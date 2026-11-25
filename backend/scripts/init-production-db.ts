#!/usr/bin/env node
/**
 * Production Database Initialization Script
 *
 * This script initializes the SQLite database for production use.
 * It creates all necessary tables and can be run before deployment.
 *
 * Usage: npx ts-node scripts/init-production-db.ts
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config';

const dbPath = config.database.connection.filename;
const dbDir = path.dirname(dbPath);

async function initializeProductionDatabase(): Promise<void> {
  console.log('🔧 Initializing production database...');
  console.log(`📁 Database path: ${dbPath}`);

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ Created database directory: ${dbDir}`);
  }

  // Ensure uploads directory exists
  const uploadDir = config.upload.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✅ Created uploads directory: ${uploadDir}`);
  }

  // Load SQL.js
  const SQL = await initSqlJs({
    locateFile: () => `sql-wasm.wasm`,
  });

  // Load existing database or create new one
  let db: Database;
  if (fs.existsSync(dbPath)) {
    const dbData = fs.readFileSync(dbPath);
    db = new SQL.Database(dbData);
    console.log('✅ Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('✅ Created new database');
  }

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('✅ Enabled foreign keys');

  // Create tables (same as in initialize.ts)
  createTables(db);
  console.log('✅ Created all tables');

  // Save database
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log(`✅ Database saved to: ${dbPath}`);

  // Verify tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('\n📊 Created tables:');
  tables[0]?.values?.forEach((row: any[]) => {
    console.log(`  - ${row[0]}`);
  });

  console.log('\n✨ Production database initialization complete!');
}

function createTables(db: Database): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      institution TEXT,
      academic_level TEXT DEFAULT 'university',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Handwriting profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS handwriting_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      original_image_url TEXT NOT NULL,
      analyzed_image_url TEXT,
      characteristics TEXT NOT NULL,
      samples TEXT,
      status TEXT DEFAULT 'pending',
      is_active BOOLEAN DEFAULT 0,
      mode TEXT DEFAULT 'personal',
      realistic_style TEXT,
      pen_color TEXT DEFAULT 'blue',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Handwriting samples table
  db.exec(`
    CREATE TABLE IF NOT EXISTS handwriting_samples (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      analyzed_image_url TEXT,
      characteristics TEXT,
      quality_score REAL DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES handwriting_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Generation settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      handwriting_mode TEXT NOT NULL,
      realistic_style TEXT,
      pen_color TEXT,
      handwriting_size TEXT DEFAULT 'medium',
      line_spacing REAL DEFAULT 1.0,
      word_spacing REAL DEFAULT 1.0,
      character_spacing REAL DEFAULT 1.0,
      margins_top INTEGER DEFAULT 80,
      margins_right INTEGER DEFAULT 60,
      margins_bottom INTEGER DEFAULT 80,
      margins_left INTEGER DEFAULT 60,
      pen_thickness REAL DEFAULT 1.0,
      question_start_mode TEXT DEFAULT 'continuous',
      show_question_numbers BOOLEAN DEFAULT 1,
      show_page_numbers BOOLEAN DEFAULT 1,
      paper_style TEXT DEFAULT 'ruled',
      page_size TEXT DEFAULT 'A4',
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Assignments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      level TEXT NOT NULL,
      questions TEXT NOT NULL,
      answers TEXT,
      handwriting_profile_id TEXT NOT NULL,
      paper_style TEXT DEFAULT 'ruled',
      page_size TEXT DEFAULT 'A4',
      settings TEXT,
      status TEXT DEFAULT 'draft',
      total_pages INTEGER DEFAULT 0,
      pdf_url TEXT,
      docx_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (handwriting_profile_id) REFERENCES handwriting_profiles(id)
    )
  `);

  // Generated assignments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assignment_id TEXT,
      handwriting_profile_id TEXT,
      generation_settings_id TEXT,
      status TEXT DEFAULT 'pending',
      mode TEXT NOT NULL,
      total_pages INTEGER DEFAULT 0,
      pages_data TEXT,
      pdf_url TEXT,
      docx_url TEXT,
      forge_metadata TEXT,
      error_message TEXT,
      generation_time_ms INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (handwriting_profile_id) REFERENCES handwriting_profiles(id),
      FOREIGN KEY (generation_settings_id) REFERENCES generation_settings(id)
    )
  `);

  // Generated pages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_pages (
      id TEXT PRIMARY KEY,
      generated_assignment_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      html_content TEXT NOT NULL,
      image_url TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (generated_assignment_id) REFERENCES generated_assignments(id) ON DELETE CASCADE
    )
  `);

  // Files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Activity log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      settings TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Composite indexes for common query patterns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_handwriting_profiles_user_active ON handwriting_profiles(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_generated_assignments_user_status ON generated_assignments(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_handwriting_samples_profile ON handwriting_samples(profile_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_files_user_purpose ON files(user_id, purpose);
  `);
}

// Run if executed directly
if (require.main === module) {
  initializeProductionDatabase()
    .then(() => {
      console.log('\n✅ Database initialization successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database initialization failed:', error);
      process.exit(1);
    });
}

export { initializeProductionDatabase };