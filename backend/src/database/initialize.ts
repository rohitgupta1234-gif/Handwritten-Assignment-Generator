import initSqlJs, { Database } from 'sql.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Type helper for sql.js values
type SqlValue = string | number | Uint8Array | null;

export function sqlToString(val: SqlValue): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toString();
  if (val instanceof Uint8Array) return new TextDecoder().decode(val);
  return String(val);
}

export function sqlToNumber(val: SqlValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val, 10);
  if (val instanceof Uint8Array) return parseInt(new TextDecoder().decode(val), 10);
  return 0;
}

export function sqlToBoolean(val: SqlValue): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
  return false;
}

let db: Database | null = null;
const dbPath = path.isAbsolute(config.database.connection.filename)
  ? config.database.connection.filename
  : path.resolve(process.cwd(), config.database.connection.filename);
const dbDir = path.dirname(dbPath);
let isSaving = false;
let saveTimer: NodeJS.Timeout | null = null;

// Transaction state for nested transactions
let transactionDepth = 0;

/**
 * Execute a callback within a database transaction
 * Supports nested transactions via savepoints
 * Handles both sync and async callbacks
 */
async function runTransaction<T>(callback: () => Promise<T> | T): Promise<T> {
  if (!db) throw new Error('Database not initialized');

  const isOuterTransaction = transactionDepth === 0;
  const savepointName = `sp_${transactionDepth}`;

  try {
    if (isOuterTransaction) {
      db.exec('BEGIN TRANSACTION');
    } else {
      db.exec(`SAVEPOINT ${savepointName}`);
    }
    transactionDepth++;

    // Execute callback and await if it returns a promise
    const result = await Promise.resolve(callback());

    transactionDepth--;

    if (isOuterTransaction) {
      db.exec('COMMIT');
    } else {
      db.exec(`RELEASE SAVEPOINT ${savepointName}`);
    }

    return result;
  } catch (error) {
    transactionDepth--;

    try {
      if (isOuterTransaction) {
        db.exec('ROLLBACK');
      } else {
        db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        db.exec(`RELEASE SAVEPOINT ${savepointName}`);
      }
    } catch (rollbackError) {
      logger.error('Failed to rollback transaction:', rollbackError);
    }

    // Enhance error with context
    const enhancedError = error instanceof Error
      ? new Error(`Transaction failed: ${error.message}`)
      : new Error(`Transaction failed: ${String(error)}`);
    enhancedError.cause = error;
    throw enhancedError;
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load SQL.js
  const SQL = await initSqlJs({
    locateFile: () => {
      const candidates = [
        path.resolve(process.cwd(), 'sql-wasm.wasm'),
        path.resolve(__dirname, '../../sql-wasm.wasm'),
        path.resolve(__dirname, '../../../sql-wasm.wasm'),
        path.resolve(__dirname, '../sql-wasm.wasm'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      try {
        return require.resolve('sql.js/dist/sql-wasm.wasm');
      } catch {
        return 'sql-wasm.wasm';
      }
    },
  });

  // Load existing database or create new one
  let dbData: Uint8Array;
  if (fs.existsSync(dbPath)) {
    dbData = fs.readFileSync(dbPath);
    db = new SQL.Database(dbData);
    logger.info('Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('Created new database');
  }

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Enable WAL mode for better durability and concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA wal_autocheckpoint = 1000;');

  // Create tables
  createTables();

  // Save database periodically (every 5s for durability)
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(saveDatabase, 5000);
  process.on('beforeExit', saveDatabase);

  logger.info('Database initialized successfully (WAL mode enabled)');
}

export function saveDatabase(): void {
  if (!db || isSaving) return;
  isSaving = true;
  try {
    const data = db.export();
    const tmpPath = `${dbPath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.copyFileSync(tmpPath, dbPath);
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (_) {}
    logger.debug('Database saved to disk');
  } catch (error) {
    logger.error('Failed to save database:', error);
  } finally {
    isSaving = false;
  }
}

function createTables(): void {
  if (!db) return;

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

  // Handwriting samples table (multiple samples per profile)
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

  // Generation settings presets
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

  // Generated assignments/pages table
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
      generation_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
      FOREIGN KEY (handwriting_profile_id) REFERENCES handwriting_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (generation_settings_id) REFERENCES generation_settings(id) ON DELETE SET NULL
    )
  `);

  // Generated pages table (individual pages for multi-page documents)
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
      FOREIGN KEY (handwriting_profile_id) REFERENCES handwriting_profiles(id) ON DELETE RESTRICT
    )
  `);

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      estimated_length INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    )
  `);

  // Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      content TEXT NOT NULL,
      handwriting_content TEXT,
      length TEXT NOT NULL,
      is_edited BOOLEAN DEFAULT 0,
      edited_content TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
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

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      settings TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_handwriting_profiles_user ON handwriting_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_handwriting_profiles_user_active ON handwriting_profiles(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_handwriting_samples_profile ON handwriting_samples(profile_id);
    CREATE INDEX IF NOT EXISTS idx_handwriting_samples_user ON handwriting_samples(user_id);
    CREATE INDEX IF NOT EXISTS idx_handwriting_samples_profile_primary ON handwriting_samples(profile_id, is_primary);
    CREATE INDEX IF NOT EXISTS idx_generation_settings_user ON generation_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_generation_settings_user_default ON generation_settings(user_id, is_default);
    CREATE INDEX IF NOT EXISTS idx_generated_assignments_user ON generated_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_generated_assignments_user_status ON generated_assignments(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_generated_assignments_user_created ON generated_assignments(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_generated_assignments_assignment ON generated_assignments(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_generated_pages_generated ON generated_pages(generated_assignment_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_assignments_user_updated ON assignments(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
    CREATE INDEX IF NOT EXISTS idx_questions_assignment ON questions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
  `);

  logger.debug('Database tables created/verified');
}

export function closeDatabase(): void {
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

// Helper functions for common queries
export const queries = {
  // Execute a query and return all rows
  all: (sql: string, params: any[] = []) => {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: Record<string, any>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  },

  // Execute a query and return first row
  get: (sql: string, params: any[] = []) => {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let result: Record<string, any> | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  // Execute a query that modifies data
  run: (sql: string, params: any[] = []) => {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.run();
    const changes = db.getRowsModified();
    stmt.free();
    return { changes, lastInsertRowid: 0 };
  },

  // Transaction helper with savepoint support for nested transactions
  transaction: <T>(callback: () => Promise<T> | T) => runTransaction(callback),

  // Typed get - converts SqlValue to proper types
  getTyped: <T extends Record<string, any>>(sql: string, params: any[] = []): T | null => {
    const result = queries.get(sql, params);
    if (!result) return null;
    const typed: Record<string, any> = {};
    for (const [key, value] of Object.entries(result)) {
      typed[key] = value;
    }
    return typed as T;
  },

  // Typed all - converts SqlValue to proper types
  allTyped: <T extends Record<string, any>>(sql: string, params: any[] = []): T[] => {
    const results = queries.all(sql, params);
    return results.map(r => {
      const typed: Record<string, any> = {};
      for (const [key, value] of Object.entries(r)) {
        typed[key] = value;
      }
      return typed as T;
    });
  },

  // Users
  createUser: (user: { id: string; email: string; password_hash: string; name: string }) => {
    return queries.run(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `, [user.id, user.email, user.password_hash, user.name]);
  },

  getUserByEmail: (email: string) => {
    return queries.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  getUserById: (id: string) => {
    return queries.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  updateUser: (id: string, data: Partial<{ name: string; avatar_url: string; bio: string; institution: string; academic_level: string; password_hash: string }>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return queries.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  },

  // Handwriting Profiles
  createHandwritingProfile: (profile: {
    id: string;
    user_id: string;
    name: string;
    original_image_url: string;
    characteristics: string;
    mode?: string;
    realistic_style?: string;
    pen_color?: string;
  }) => {
    return queries.run(`
      INSERT INTO handwriting_profiles (id, user_id, name, original_image_url, characteristics, mode, realistic_style, pen_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [profile.id, profile.user_id, profile.name, profile.original_image_url, profile.characteristics, profile.mode || 'personal', profile.realistic_style || null, profile.pen_color || 'blue']);
  },

  getHandwritingProfilesByUser: (userId: string) => {
    return queries.all('SELECT * FROM handwriting_profiles WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  },

  getHandwritingProfileById: (id: string) => {
    return queries.get('SELECT * FROM handwriting_profiles WHERE id = ?', [id]);
  },

  updateHandwritingProfile: (id: string, data: Partial<{
    name: string;
    analyzed_image_url: string;
    characteristics: string;
    samples: string;
    status: string;
    is_active: number;
    mode: string;
    realistic_style: string;
    pen_color: string;
  }>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    if (fields) {
      return queries.run(`UPDATE handwriting_profiles SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
    }
    // No fields to update, just update the timestamp
    return queries.run(`UPDATE handwriting_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  deleteHandwritingProfile: (id: string) => {
    return queries.run('DELETE FROM handwriting_profiles WHERE id = ?', [id]);
  },

  setActiveProfile: (userId: string, profileId: string) => {
    return queries.transaction(() => {
      queries.run('UPDATE handwriting_profiles SET is_active = 0 WHERE user_id = ?', [userId]);
      queries.run('UPDATE handwriting_profiles SET is_active = 1 WHERE id = ?', [profileId]);
    });
  },

  // Handwriting Samples
  createHandwritingSample: (sample: {
    id: string;
    profile_id: string;
    user_id: string;
    image_url: string;
    analyzed_image_url?: string;
    characteristics?: string;
    quality_score?: number;
    is_primary?: number;
    order_index?: number;
  }) => {
    return queries.run(`
      INSERT INTO handwriting_samples (id, profile_id, user_id, image_url, analyzed_image_url, characteristics, quality_score, is_primary, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sample.id, sample.profile_id, sample.user_id, sample.image_url, sample.analyzed_image_url || null, sample.characteristics || null, sample.quality_score || 0, sample.is_primary || 0, sample.order_index || 0]);
  },

  getHandwritingSamplesByProfile: (profileId: string) => {
    return queries.all('SELECT * FROM handwriting_samples WHERE profile_id = ? ORDER BY order_index ASC', [profileId]);
  },

  getHandwritingSampleById: (id: string) => {
    return queries.get('SELECT * FROM handwriting_samples WHERE id = ?', [id]);
  },

  updateHandwritingSample: (id: string, data: Partial<{
    analyzed_image_url: string;
    characteristics: string;
    quality_score: number;
    is_primary: number;
    order_index: number;
  }>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return queries.run(`UPDATE handwriting_samples SET ${fields} WHERE id = ?`, [...values, id]);
  },

  deleteHandwritingSample: (id: string) => {
    return queries.run('DELETE FROM handwriting_samples WHERE id = ?', [id]);
  },

  deleteAllSamplesForProfile: (profileId: string) => {
    return queries.run('DELETE FROM handwriting_samples WHERE profile_id = ?', [profileId]);
  },

  // Generation Settings
  createGenerationSettings: (settings: {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    handwriting_mode: string;
    realistic_style?: string;
    pen_color?: string;
    handwriting_size: string;
    line_spacing: number;
    word_spacing: number;
    character_spacing: number;
    margins_top: number;
    margins_right: number;
    margins_bottom: number;
    margins_left: number;
    pen_thickness: number;
    question_start_mode: string;
    show_question_numbers: number;
    show_page_numbers: number;
    paper_style: string;
    page_size: string;
    is_default?: number;
  }) => {
    return queries.run(`
      INSERT INTO generation_settings (id, user_id, name, description, handwriting_mode, realistic_style, pen_color, handwriting_size, line_spacing, word_spacing, character_spacing, margins_top, margins_right, margins_bottom, margins_left, pen_thickness, question_start_mode, show_question_numbers, show_page_numbers, paper_style, page_size, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [settings.id, settings.user_id, settings.name, settings.description || null, settings.handwriting_mode, settings.realistic_style || null, settings.pen_color || null, settings.handwriting_size, settings.line_spacing, settings.word_spacing, settings.character_spacing, settings.margins_top, settings.margins_right, settings.margins_bottom, settings.margins_left, settings.pen_thickness, settings.question_start_mode, settings.show_question_numbers, settings.show_page_numbers, settings.paper_style, settings.page_size, settings.is_default || 0]);
  },

  getGenerationSettingsByUser: (userId: string) => {
    return queries.all('SELECT * FROM generation_settings WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [userId]);
  },

  getGenerationSettingsById: (id: string) => {
    return queries.get('SELECT * FROM generation_settings WHERE id = ?', [id]);
  },

  updateGenerationSettings: (id: string, data: any) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return queries.run(`UPDATE generation_settings SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  },

  deleteGenerationSettings: (id: string) => {
    return queries.run('DELETE FROM generation_settings WHERE id = ?', [id]);
  },

  setDefaultGenerationSettings: (userId: string, settingsId: string) => {
    return queries.transaction(() => {
      queries.run('UPDATE generation_settings SET is_default = 0 WHERE user_id = ?', [userId]);
      queries.run('UPDATE generation_settings SET is_default = 1 WHERE id = ?', [settingsId]);
    });
  },

  // Generated Assignments
  createGeneratedAssignment: (ga: {
    id: string;
    user_id: string;
    assignment_id?: string;
    handwriting_profile_id?: string;
    generation_settings_id?: string;
    status: string;
    mode: string;
    total_pages: number;
    pages_data?: string;
    pdf_url?: string;
    docx_url?: string;
    forge_metadata?: string;
    error_message?: string;
    generation_time_ms?: number;
  }) => {
    return queries.run(`
      INSERT INTO generated_assignments (id, user_id, assignment_id, handwriting_profile_id, generation_settings_id, status, mode, total_pages, pages_data, pdf_url, docx_url, forge_metadata, error_message, generation_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ga.id, ga.user_id, ga.assignment_id || null, ga.handwriting_profile_id || null, ga.generation_settings_id || null, ga.status, ga.mode, ga.total_pages, ga.pages_data || null, ga.pdf_url || null, ga.docx_url || null, ga.forge_metadata || null, ga.error_message || null, ga.generation_time_ms || 0]);
  },

  getGeneratedAssignmentsByUser: (userId: string, limit = 50, offset = 0) => {
    return queries.all('SELECT * FROM generated_assignments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
  },

  getGeneratedAssignmentById: (id: string) => {
    return queries.get('SELECT * FROM generated_assignments WHERE id = ?', [id]);
  },

  updateGeneratedAssignment: (id: string, data: Partial<{
    assignment_id: string;
    handwriting_profile_id: string;
    generation_settings_id: string;
    status: string;
    total_pages: number;
    pages_data: string;
    pdf_url: string;
    docx_url: string;
    forge_metadata: string;
    error_message: string;
    generation_time_ms: number;
  }>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return queries.run(`UPDATE generated_assignments SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  },

  deleteGeneratedAssignment: (id: string) => {
    return queries.run('DELETE FROM generated_assignments WHERE id = ?', [id]);
  },

  // Generated Pages
  createGeneratedPage: (page: {
    id: string;
    generated_assignment_id: string;
    page_number: number;
    html_content: string;
    image_url?: string;
    width: number;
    height: number;
  }) => {
    return queries.run(`
      INSERT INTO generated_pages (id, generated_assignment_id, page_number, html_content, image_url, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [page.id, page.generated_assignment_id, page.page_number, page.html_content, page.image_url || null, page.width, page.height]);
  },

  getGeneratedPagesByAssignment: (generatedAssignmentId: string) => {
    return queries.all('SELECT * FROM generated_pages WHERE generated_assignment_id = ? ORDER BY page_number ASC', [generatedAssignmentId]);
  },

  // Assignments
  createAssignment: (assignment: {
    id: string;
    user_id: string;
    title: string;
    subject: string;
    level: string;
    questions: string;
    handwriting_profile_id: string;
    paper_style: string;
    page_size: string;
    settings: string;
  }) => {
    return queries.run(`
      INSERT INTO assignments (id, user_id, title, subject, level, questions, handwriting_profile_id, paper_style, page_size, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assignment.id,
      assignment.user_id,
      assignment.title,
      assignment.subject,
      assignment.level,
      assignment.questions,
      assignment.handwriting_profile_id,
      assignment.paper_style,
      assignment.page_size,
      assignment.settings
    ]);
  },

  getAssignmentsByUser: (userId: string, limit = 50, offset = 0) => {
    return queries.all(`
      SELECT * FROM assignments WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
  },

  getAssignmentById: (id: string) => {
    return queries.get('SELECT * FROM assignments WHERE id = ?', [id]);
  },

  updateAssignment: (id: string, data: Partial<{
    title: string;
    subject: string;
    level: string;
    questions: string;
    answers: string;
    paper_style: string;
    page_size: string;
    settings: string;
    status: string;
    total_pages: number;
    pdf_url: string;
    docx_url: string;
  }>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return queries.run(`UPDATE assignments SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  },

  deleteAssignment: (id: string) => {
    return queries.run('DELETE FROM assignments WHERE id = ?', [id]);
  },

  // Activity Log
  logActivity: (activity: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    metadata?: string;
  }) => {
    return queries.run(`
      INSERT INTO activity_log (id, user_id, type, title, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [activity.id, activity.user_id, activity.type, activity.title, activity.description || null, activity.metadata || null]);
  },

  getUserActivity: (userId: string, limit = 20) => {
    return queries.all('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
  },

  // Files
  createFile: (file: {
    id: string;
    user_id: string;
    original_name: string;
    stored_name: string;
    mime_type: string;
    size: number;
    url: string;
    purpose?: string;
  }) => {
    return queries.run(`
      INSERT INTO files (id, user_id, original_name, stored_name, mime_type, size, url, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [file.id, file.user_id, file.original_name, file.stored_name, file.mime_type, file.size, file.url, file.purpose || null]);
  },

  getFilesByUser: (userId: string) => {
    return queries.all('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  },

  // Settings
  getUserSettings: (userId: string) => {
    return queries.get('SELECT settings FROM user_settings WHERE user_id = ?', [userId]);
  },

  updateUserSettings: (userId: string, settings: string) => {
    return queries.run(`
      INSERT INTO user_settings (user_id, settings, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = CURRENT_TIMESTAMP
    `, [userId, settings, settings]);
  },

  // Refresh Tokens
  createRefreshToken: (token: { id: string; user_id: string; token_hash: string; expires_at: string }) => {
    return queries.run(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `, [token.id, token.user_id, token.token_hash, token.expires_at]);
  },

  getRefreshToken: (tokenHash: string) => {
    return queries.get('SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP', [tokenHash]);
  },

  getAllValidRefreshTokens: () => {
    return queries.all('SELECT * FROM refresh_tokens WHERE expires_at > CURRENT_TIMESTAMP');
  },

  getRefreshTokensByUser: (userId: string) => {
    return queries.all('SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP', [userId]);
  },

  deleteRefreshToken: (tokenHash: string) => {
    return queries.run('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
  },

  deleteUserRefreshTokens: (userId: string) => {
    return queries.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  },
};