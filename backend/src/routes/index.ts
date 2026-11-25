import express, { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { queries, getDatabase, sqlToString, sqlToNumber, sqlToBoolean } from '../database/initialize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateHandwrittenPages, generateFullHTML } from '../services/handwritingSynthesis';
import { generateAssignmentPDF } from '../services/pdfExportHeadless';
import { generateAssignmentDOCX } from '../services/docxExportHeadless';
import { generateAnswer, generateAnswers } from '../services/aiService';
import { analyzeHandwritingImage } from '../services/handwritingAnalysis';
import { getHandwritingGenerationService } from '../services/handwritingGeneration';
import { getForgeClient } from '../services/forgeClient';
import { getMultiSampleAnalyzer } from '../services/multiSampleAnalysis';
import { performOCR } from '../services/ocrService';
import { PaperStyle, PageSize } from '../types';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const router = Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError(400, 'Name, email, and password are required');
  }

  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const existingUser = queries.getUserByEmail(email);
  if (existingUser) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const userId = uuidv4();

  queries.createUser({ id: userId, email, password_hash: passwordHash, name });

  const tokens = generateTokens({ id: userId, email, name });

  // Store refresh token
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, config.bcrypt.saltRounds);
  queries.createRefreshToken({
    id: uuidv4(),
    user_id: userId,
    token_hash: refreshTokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Set refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
  });

  // Log activity
  queries.logActivity({
    id: uuidv4(),
    user_id: userId,
    type: 'user_registered',
    title: 'Account Created',
    description: 'New user registered',
  });

  res.status(201).json({
    user: { id: userId, email, name },
    accessToken: tokens.accessToken,
  });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  const user = queries.getUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, sqlToString(user.password_hash));
  if (!validPassword) {
    throw new AppError(401, 'Invalid credentials');
  }

  const tokens = generateTokens({ id: sqlToString(user.id), email: sqlToString(user.email), name: sqlToString(user.name) });

  // Store refresh token
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, config.bcrypt.saltRounds);
  queries.createRefreshToken({
    id: uuidv4(),
    user_id: sqlToString(user.id),
    token_hash: refreshTokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
  });

  // Log activity
  queries.logActivity({
    id: uuidv4(),
    user_id: sqlToString(user.id),
    type: 'user_login',
    title: 'User Login',
    description: 'User logged in',
  });

  res.json({
    user: { id: sqlToString(user.id), email: sqlToString(user.email), name: sqlToString(user.name) },
    accessToken: tokens.accessToken,
  });
}));

router.post('/auth/logout', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    const tokenHash = await bcrypt.hash(refreshToken, config.bcrypt.saltRounds);
    queries.deleteRefreshToken(tokenHash);
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new AppError(401, 'No refresh token');
  }

  // Decode JWT to get user ID (without verification - just for lookup)
  let userId: string;
  try {
    const decoded = jwt.decode(refreshToken) as { id?: string; type?: string } | null;
    if (!decoded || decoded.type !== 'refresh' || !decoded.id) {
      throw new AppError(401, 'Invalid refresh token format');
    }
    userId = decoded.id;
  } catch {
    throw new AppError(401, 'Invalid refresh token format');
  }

  // Get only this user's valid refresh tokens
  const userTokens = queries.getRefreshTokensByUser(userId);
  let storedToken = null;

  for (const token of userTokens) {
    const isValid = await bcrypt.compare(refreshToken, sqlToString(token.token_hash));
    if (isValid) {
      storedToken = token;
      break;
    }
  }

  if (!storedToken) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const user = queries.getUserById(userId);
  if (!user) {
    throw new AppError(401, 'User not found');
  }

  // Rotate refresh token
  queries.deleteRefreshToken(sqlToString(storedToken.token_hash));

  const tokens = generateTokens({ id: sqlToString(user.id), email: sqlToString(user.email), name: sqlToString(user.name) });
  const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, config.bcrypt.saltRounds);

  queries.createRefreshToken({
    id: uuidv4(),
    user_id: sqlToString(user.id),
    token_hash: newRefreshTokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
  });

  res.json({ accessToken: tokens.accessToken });
}));

router.get('/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = queries.getUserById(req.user!.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({
    user: {
      id: sqlToString(user.id),
      email: sqlToString(user.email),
      name: sqlToString(user.name),
      avatar_url: user.avatar_url ? sqlToString(user.avatar_url) : null,
      bio: user.bio ? sqlToString(user.bio) : null,
      institution: user.institution ? sqlToString(user.institution) : null,
      academic_level: user.academic_level ? sqlToString(user.academic_level) : 'university',
      created_at: user.created_at ? sqlToString(user.created_at) : null,
    },
  });
}));

router.put('/auth/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { name, bio, institution, academic_level } = req.body;

  // Filter out undefined values to avoid invalid SQL
  const updateData: Partial<{ name: string; bio: string; institution: string; academic_level: string }> = {};
  if (name !== undefined) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio;
  if (institution !== undefined) updateData.institution = institution;
  if (academic_level !== undefined) updateData.academic_level = academic_level;

  // Only update if there are valid fields
  if (Object.keys(updateData).length > 0) {
    queries.updateUser(req.user!.id, updateData);
  }

  const user = queries.getUserById(req.user!.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'profile_updated',
    title: 'Profile Updated',
    description: 'User profile information updated',
  });

  // Convert sql.js values to strings using sqlToString (like /auth/me does)
  res.json({
    user: {
      id: sqlToString(user.id),
      email: sqlToString(user.email),
      name: sqlToString(user.name),
      avatar_url: user.avatar_url ? sqlToString(user.avatar_url) : null,
      bio: user.bio ? sqlToString(user.bio) : null,
      institution: user.institution ? sqlToString(user.institution) : null,
      academic_level: user.academic_level ? sqlToString(user.academic_level) : 'university',
    },
  });
}));

// Change password
router.put('/auth/password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new AppError(400, 'New password must be at least 8 characters');
  }

  const user = queries.getUserById(req.user!.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const validPassword = await bcrypt.compare(currentPassword, sqlToString(user.password_hash));
  if (!validPassword) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  queries.updateUser(req.user!.id, { password_hash: passwordHash });

  // Invalidate all refresh tokens to force re-login
  queries.deleteUserRefreshTokens(req.user!.id);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'password_changed',
    title: 'Password Changed',
    description: 'User changed their password',
  });

  res.json({ message: 'Password changed successfully. Please log in again.' });
}));

// Delete account
router.delete('/auth/account', authMiddleware, asyncHandler(async (req, res) => {
  const user = queries.getUserById(req.user!.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Log activity before deletion
  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'account_deleted',
    title: 'Account Deleted',
    description: 'User deleted their account',
  });

  // Delete user (cascades to all related data)
  queries.run('DELETE FROM users WHERE id = ?', [req.user!.id]);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({ message: 'Account deleted successfully' });
}));

// Export user data
router.get('/auth/export', authMiddleware, asyncHandler(async (req, res) => {
  const user = queries.getUserById(req.user!.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const assignments = queries.getAssignmentsByUser(req.user!.id, 1000, 0);
  const handwritingProfiles = queries.getHandwritingProfilesByUser(req.user!.id);
  const activity = queries.getUserActivity(req.user!.id, 1000);
  const files = queries.getFilesByUser(req.user!.id);

  const exportData = {
    user: {
      id: sqlToString(user.id),
      email: sqlToString(user.email),
      name: sqlToString(user.name),
      avatar_url: user.avatar_url ? sqlToString(user.avatar_url) : null,
      bio: user.bio ? sqlToString(user.bio) : null,
      institution: user.institution ? sqlToString(user.institution) : null,
      academic_level: user.academic_level ? sqlToString(user.academic_level) : 'university',
      created_at: user.created_at ? sqlToString(user.created_at) : null,
    },
    assignments: assignments.map(a => ({
      id: sqlToString(a.id),
      title: sqlToString(a.title),
      subject: sqlToString(a.subject),
      level: sqlToString(a.level),
      questions: JSON.parse(sqlToString(a.questions)),
      answers: a.answers ? JSON.parse(sqlToString(a.answers)) : [],
      handwritingProfileId: sqlToString(a.handwriting_profile_id),
      paperStyle: sqlToString(a.paper_style),
      pageSize: sqlToString(a.page_size),
      settings: a.settings ? JSON.parse(sqlToString(a.settings)) : {},
      status: sqlToString(a.status),
      totalPages: sqlToNumber(a.total_pages),
      pdfUrl: a.pdf_url ? sqlToString(a.pdf_url) : null,
      docxUrl: a.docx_url ? sqlToString(a.docx_url) : null,
      createdAt: sqlToString(a.created_at),
      updatedAt: sqlToString(a.updated_at),
    })),
    handwritingProfiles: handwritingProfiles.map(p => ({
      id: sqlToString(p.id),
      name: sqlToString(p.name),
      originalImageUrl: sqlToString(p.original_image_url),
      analyzedImageUrl: p.analyzed_image_url ? sqlToString(p.analyzed_image_url) : null,
      characteristics: JSON.parse(sqlToString(p.characteristics)),
      samples: p.samples ? JSON.parse(sqlToString(p.samples)) : [],
      status: sqlToString(p.status),
      isActive: sqlToBoolean(p.is_active),
      createdAt: sqlToString(p.created_at),
      updatedAt: sqlToString(p.updated_at),
    })),
    activity: activity.map(a => ({
      id: sqlToString(a.id),
      type: sqlToString(a.type),
      title: sqlToString(a.title),
      description: a.description ? sqlToString(a.description) : null,
      timestamp: a.created_at ? sqlToString(a.created_at) : null,
      metadata: a.metadata ? JSON.parse(sqlToString(a.metadata)) : null,
    })),
    files: files.map(f => ({
      id: sqlToString(f.id),
      originalName: sqlToString(f.original_name),
      url: sqlToString(f.url),
      size: sqlToNumber(f.size),
      mimeType: sqlToString(f.mime_type),
      purpose: f.purpose ? sqlToString(f.purpose) : null,
      createdAt: sqlToString(f.created_at),
    })),
    exportedAt: new Date().toISOString(),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="handwriteai-export-${Date.now()}.json"`);
  res.send(JSON.stringify(exportData, null, 2));
}));

// Avatar upload
router.post('/auth/avatar', authMiddleware, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No avatar file provided');
  }

  if (!req.file.mimetype.startsWith('image/')) {
    throw new AppError(400, 'Avatar must be an image');
  }

  if (req.file.size > 5 * 1024 * 1024) {
    throw new AppError(400, 'Avatar must be less than 5MB');
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  queries.updateUser(req.user!.id, { avatar_url: fileUrl });

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'avatar_updated',
    title: 'Avatar Updated',
    description: 'User updated their profile picture',
  });

  res.json({
    user: {
      avatar_url: fileUrl,
    },
  });
}));

// Connected accounts (placeholder - would integrate with OAuth providers in production)
router.get('/auth/connections', authMiddleware, asyncHandler(async (req, res) => {
  // In production, fetch from user_oauth_connections table
  res.json({
    connections: [
      { provider: 'google', connected: false, email: null },
      { provider: 'github', connected: false, email: null },
      { provider: 'microsoft', connected: false, email: null },
    ],
  });
}));

router.post('/auth/connections/:provider', authMiddleware, asyncHandler(async (req, res) => {
  // In production, initiate OAuth flow
  res.json({ message: `${req.params.provider} connection initiated (not implemented)` });
}));

router.delete('/auth/connections/:provider', authMiddleware, asyncHandler(async (req, res) => {
  // In production, remove OAuth connection
  res.json({ message: `${req.params.provider} disconnected (not implemented)` });
}));

// ==================== HANDWRITING ROUTES ====================
router.post('/handwriting/profiles', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No image file provided');
  }

  const { name = 'My Handwriting' } = req.body;
  const profileId = uuidv4();
  const userId = req.user!.id;

  // Save file record
  const fileUrl = `/uploads/${req.file.filename}`;
  queries.createFile({
    id: uuidv4(),
    user_id: userId,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    purpose: 'handwriting',
  });

  // Create profile with pending status
  const characteristics = {
    letterHeight: 0,
    letterWidth: 0,
    capitalHeight: 0,
    smallHeight: 0,
    characterSpacing: 0,
    wordSpacing: 0,
    lineSpacing: 0,
    writingAngle: 0,
    penThickness: 0,
    baselineAlignment: 0,
    paragraphSpacing: 0,
    avgWordsPerLine: 0,
    pageMargins: { top: 0, right: 0, bottom: 0, left: 0 },
    slantDirection: 'vertical',
    pressureVariation: 0,
    connectedness: 0,
  };

  queries.createHandwritingProfile({
    id: profileId,
    user_id: userId,
    name,
    original_image_url: fileUrl,
    characteristics: JSON.stringify(characteristics),
  });

  // Log activity
  queries.logActivity({
    id: uuidv4(),
    user_id: userId,
    type: 'handwriting_uploaded',
    title: 'Handwriting Sample Uploaded',
    description: `Uploaded "${name}" for analysis`,
  });

  // TODO: Trigger async analysis job
  // For now, return immediately
  res.status(201).json({
    profile: {
      id: profileId,
      userId,
      name,
      originalImageUrl: fileUrl,
      characteristics,
      status: 'pending',
      isActive: false,
      createdAt: new Date().toISOString(),
    },
  });
}));

router.get('/handwriting/profiles', authMiddleware, asyncHandler(async (req, res) => {
  const profiles = queries.getHandwritingProfilesByUser(req.user!.id);

  const formatted = profiles.map(p => ({
    id: sqlToString(p.id),
    userId: sqlToString(p.user_id),
    name: sqlToString(p.name),
    originalImageUrl: sqlToString(p.original_image_url),
    analyzedImageUrl: p.analyzed_image_url ? sqlToString(p.analyzed_image_url) : null,
    characteristics: JSON.parse(sqlToString(p.characteristics)),
    samples: p.samples ? JSON.parse(sqlToString(p.samples)) : [],
    status: sqlToString(p.status),
    isActive: sqlToBoolean(p.is_active),
    createdAt: sqlToString(p.created_at),
    updatedAt: sqlToString(p.updated_at),
  }));

  res.json({ profiles: formatted });
}));

router.get('/handwriting/profiles/:id', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);

  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  res.json({
    profile: {
      id: sqlToString(profile.id),
      userId: sqlToString(profile.user_id),
      name: sqlToString(profile.name),
      originalImageUrl: sqlToString(profile.original_image_url),
      analyzedImageUrl: profile.analyzed_image_url ? sqlToString(profile.analyzed_image_url) : null,
      characteristics: JSON.parse(sqlToString(profile.characteristics)),
      samples: profile.samples ? JSON.parse(sqlToString(profile.samples)) : [],
      status: sqlToString(profile.status),
      isActive: Boolean(profile.is_active),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
  });
}));

router.put('/handwriting/profiles/:id', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);

  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  const { name, isActive } = req.body;
  const updates: any = {};

  if (name) updates.name = name;
  if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;

  queries.updateHandwritingProfile(req.params.id, updates);

  if (isActive) {
    queries.setActiveProfile(req.user!.id, req.params.id);
  }

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'handwriting_profile_updated',
    title: 'Handwriting Profile Updated',
    description: `Updated profile "${name || sqlToString(profile.name)}"`,
  });

  const updated = queries.getHandwritingProfileById(req.params.id);
  res.json({
    profile: {
      id: sqlToString(updated!.id),
      userId: sqlToString(updated!.user_id),
      name: sqlToString(updated!.name),
      originalImageUrl: sqlToString(updated!.original_image_url),
      analyzedImageUrl: updated!.analyzed_image_url ? sqlToString(updated!.analyzed_image_url) : null,
      characteristics: JSON.parse(sqlToString(updated!.characteristics)),
      samples: updated!.samples ? JSON.parse(sqlToString(updated!.samples)) : [],
      status: sqlToString(updated!.status),
      isActive: sqlToBoolean(updated!.is_active),
      createdAt: sqlToString(updated!.created_at),
      updatedAt: sqlToString(updated!.updated_at),
    },
  });
}));

router.delete('/handwriting/profiles/:id', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);

  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  queries.deleteHandwritingProfile(req.params.id);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'handwriting_profile_deleted',
    title: 'Handwriting Profile Deleted',
    description: `Deleted profile "${sqlToString(profile.name)}"`,
  });

  res.json({ message: 'Profile deleted successfully' });
}));

router.post('/handwriting/profiles/:id/analyze', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);

  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  const originalImageUrl = sqlToString(profile.original_image_url);
  const imagePath = path.join(config.upload.uploadDir, path.basename(originalImageUrl));

  if (!fs.existsSync(imagePath)) {
    throw new AppError(404, 'Original image file not found');
  }

  try {
    // Perform real handwriting analysis
    const analysisResult = await analyzeHandwritingImage(imagePath);
    const characteristics = analysisResult.characteristics;

    // Save analyzed image
    const analyzedFilename = `analyzed-${path.basename(originalImageUrl, path.extname(originalImageUrl))}.png`;
    const analyzedPath = path.join(config.upload.uploadDir, analyzedFilename);
    await fs.promises.writeFile(analyzedPath, analysisResult.analyzedImageBuffer);
    const analyzedImageUrl = `/uploads/${analyzedFilename}`;

    queries.updateHandwritingProfile(req.params.id, {
      characteristics: JSON.stringify(characteristics),
      status: 'completed',
      analyzed_image_url: analyzedImageUrl,
    });

    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'handwriting_analyzed',
      title: 'Handwriting Analyzed',
      description: `Analysis completed for "${sqlToString(profile.name)}"`,
      metadata: JSON.stringify({
        slantAngle: characteristics.writingAngle,
        strokeWidth: characteristics.penThickness,
        baselineAlignment: characteristics.baselineAlignment,
      }),
    });

    res.json({
      profile: {
        id: sqlToString(profile.id),
        userId: sqlToString(profile.user_id),
        name: sqlToString(profile.name),
        originalImageUrl: sqlToString(profile.original_image_url),
        analyzedImageUrl,
        characteristics,
        status: 'completed',
        isActive: Boolean(profile.is_active),
        createdAt: sqlToString(profile.created_at),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    queries.updateHandwritingProfile(req.params.id, {
      status: 'failed',
    });

    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'handwriting_analysis_failed',
      title: 'Handwriting Analysis Failed',
      description: `Analysis failed for "${sqlToString(profile.name)}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    });

    throw new AppError(500, `Handwriting analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

// ==================== NEW HANDWRITING ROUTES FOR DUAL SYSTEM ====================

// Handwriting Samples - Multiple samples per profile
router.post('/handwriting/profiles/:id/samples', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No image file provided');
  }

  const profile = queries.getHandwritingProfileById(req.params.id);
  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  const sampleId = uuidv4();
  const userId = req.user!.id;
  const fileUrl = `/uploads/${req.file.filename}`;

  // Save file record
  queries.createFile({
    id: uuidv4(),
    user_id: userId,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    purpose: 'handwriting_sample',
  });

  // Get current sample count for ordering
  const existingSamples = queries.getHandwritingSamplesByProfile(req.params.id);
  const orderIndex = existingSamples.length;

  // Create sample record
  queries.createHandwritingSample({
    id: sampleId,
    profile_id: req.params.id,
    user_id: userId,
    image_url: fileUrl,
    order_index: orderIndex,
    is_primary: orderIndex === 0 ? 1 : 0,
  });

  queries.logActivity({
    id: uuidv4(),
    user_id: userId,
    type: 'handwriting_sample_added',
    title: 'Handwriting Sample Added',
    description: `Added sample to "${sqlToString(profile.name)}"`,
  });

  res.status(201).json({
    sample: {
      id: sampleId,
      profileId: req.params.id,
      userId,
      imageUrl: fileUrl,
      orderIndex,
      isPrimary: orderIndex === 0,
      createdAt: new Date().toISOString(),
    },
  });
}));

router.get('/handwriting/profiles/:id/samples', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);
  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  const samples = queries.getHandwritingSamplesByProfile(req.params.id);
  const formatted = samples.map(s => ({
    id: sqlToString(s.id),
    profileId: sqlToString(s.profile_id),
    userId: sqlToString(s.user_id),
    imageUrl: sqlToString(s.image_url),
    analyzedImageUrl: s.analyzed_image_url ? sqlToString(s.analyzed_image_url) : null,
    characteristics: s.characteristics ? JSON.parse(sqlToString(s.characteristics)) : null,
    qualityScore: s.quality_score,
    isPrimary: Boolean(s.is_primary),
    orderIndex: s.order_index,
    createdAt: sqlToString(s.created_at),
  }));

  res.json({ samples: formatted });
}));

router.delete('/handwriting/samples/:sampleId', authMiddleware, asyncHandler(async (req, res) => {
  const sample = queries.getHandwritingSampleById(req.params.sampleId);
  if (!sample || sqlToString(sample.user_id) !== req.user!.id) {
    throw new AppError(404, 'Sample not found');
  }

  queries.deleteHandwritingSample(req.params.sampleId);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'handwriting_sample_deleted',
    title: 'Handwriting Sample Deleted',
    description: `Deleted sample from profile`,
  });

  res.json({ message: 'Sample deleted successfully' });
}));

router.post('/handwriting/profiles/:id/analyze-multi', authMiddleware, asyncHandler(async (req, res) => {
  const profile = queries.getHandwritingProfileById(req.params.id);
  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Profile not found');
  }

  const samples = queries.getHandwritingSamplesByProfile(req.params.id);
  if (samples.length < 2) {
    throw new AppError(400, 'At least 2 samples required for multi-sample analysis');
  }

  try {
    queries.updateHandwritingProfile(req.params.id, { status: 'analyzing' });

    const analyzer = getMultiSampleAnalyzer();
    const result = await analyzer.analyzeSamples(
      samples.map(s => ({
        id: sqlToString(s.id),
        profileId: sqlToString(s.profile_id),
        userId: sqlToString(s.user_id),
        imageUrl: sqlToString(s.image_url),
        analyzedImageUrl: s.analyzed_image_url ? sqlToString(s.analyzed_image_url) : undefined,
        characteristics: s.characteristics ? JSON.parse(sqlToString(s.characteristics)) : undefined,
        qualityScore: s.quality_score,
        isPrimary: Boolean(s.is_primary),
        orderIndex: s.order_index,
        createdAt: sqlToString(s.created_at),
      }))
    );

    // Save analyzed image from primary sample
    const primarySample = samples.find(s => s.is_primary);
    if (primarySample) {
      const originalPath = path.join(config.upload.uploadDir, path.basename(sqlToString(primarySample.image_url)));
      const analyzedImageBuffer = await analyzer['generateAnalyzedImage'](originalPath, [], result.combinedCharacteristics, 800, 1000);
      const analyzedFilename = `analyzed-multi-${path.basename(sqlToString(primarySample.image_url), path.extname(sqlToString(primarySample.image_url)))}.png`;
      const analyzedPath = path.join(config.upload.uploadDir, analyzedFilename);
      await fs.promises.writeFile(analyzedPath, analyzedImageBuffer);
      const analyzedImageUrl = `/uploads/${analyzedFilename}`;

      queries.updateHandwritingProfile(req.params.id, {
        characteristics: JSON.stringify(result.combinedCharacteristics),
        status: 'completed',
        analyzed_image_url: analyzedImageUrl,
      });
    } else {
      queries.updateHandwritingProfile(req.params.id, {
        characteristics: JSON.stringify(result.combinedCharacteristics),
        status: 'completed',
      });
    }

    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'handwriting_multi_analyzed',
      title: 'Multi-Sample Handwriting Analyzed',
      description: `Multi-sample analysis completed for "${sqlToString(profile.name)}" (${samples.length} samples)`,
      metadata: JSON.stringify({
        sampleCount: samples.length,
        consistencyScore: result.consistencyScore,
        warnings: result.warnings,
      }),
    });

    res.json({
      profile: {
        id: sqlToString(profile.id),
        userId: sqlToString(profile.user_id),
        name: sqlToString(profile.name),
        originalImageUrl: sqlToString(profile.original_image_url),
        analyzedImageUrl: primarySample ? `/uploads/analyzed-multi-${path.basename(sqlToString(primarySample.image_url), path.extname(sqlToString(primarySample.image_url)))}.png` : null,
        characteristics: result.combinedCharacteristics,
        status: 'completed',
        isActive: Boolean(profile.is_active),
        createdAt: sqlToString(profile.created_at),
        updatedAt: new Date().toISOString(),
      },
      analysis: {
        individualResults: result.individualResults,
        consistencyScore: result.consistencyScore,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    queries.updateHandwritingProfile(req.params.id, { status: 'failed' });
    throw new AppError(500, `Multi-sample analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

// Generation Settings Presets
router.post('/handwriting/generation-settings', authMiddleware, asyncHandler(async (req, res) => {
  const { name, description, handwritingMode, realisticStyle, penColor, ...settings } = req.body;

  if (!name || !handwritingMode) {
    throw new AppError(400, 'Name and handwriting mode are required');
  }

  const settingsId = uuidv4();
  const userId = req.user!.id;

  const dbSettings = {
    id: settingsId,
    user_id: userId,
    name,
    description: description || null,
    handwriting_mode: handwritingMode,
    realistic_style: realisticStyle || null,
    pen_color: penColor || null,
    handwriting_size: settings.handwritingSize || 'medium',
    line_spacing: settings.lineSpacing || 1.0,
    word_spacing: settings.wordSpacing || 1.0,
    character_spacing: settings.characterSpacing || 1.0,
    margins_top: settings.margins?.top || 80,
    margins_right: settings.margins?.right || 60,
    margins_bottom: settings.margins?.bottom || 80,
    margins_left: settings.margins?.left || 60,
    pen_thickness: settings.penThickness || 1.0,
    question_start_mode: settings.questionStartMode || 'continuous',
    show_question_numbers: settings.showQuestionNumbers ? 1 : 0,
    show_page_numbers: settings.showPageNumbers ? 1 : 0,
    paper_style: settings.paperStyle || 'ruled',
    page_size: settings.pageSize || 'A4',
    is_default: settings.isDefault ? 1 : 0,
  };

  queries.createGenerationSettings(dbSettings);

  // If this is set as default, unset other defaults
  if (settings.isDefault) {
    queries.setDefaultGenerationSettings(userId, settingsId);
  }

  queries.logActivity({
    id: uuidv4(),
    user_id: userId,
    type: 'generation_settings_created',
    title: 'Generation Settings Created',
    description: `Created "${name}" preset`,
  });

  res.status(201).json({
    settings: {
      id: settingsId,
      userId,
      name,
      description,
      handwritingMode,
      realisticStyle,
      penColor,
      ...settings,
      isDefault: settings.isDefault || false,
      createdAt: new Date().toISOString(),
    },
  });
}));

router.get('/handwriting/generation-settings', authMiddleware, asyncHandler(async (req, res) => {
  const settings = queries.getGenerationSettingsByUser(req.user!.id);
  const formatted = settings.map(s => ({
    id: sqlToString(s.id),
    userId: sqlToString(s.user_id),
    name: sqlToString(s.name),
    description: s.description ? sqlToString(s.description) : null,
    handwritingMode: sqlToString(s.handwriting_mode),
    realisticStyle: s.realistic_style ? sqlToString(s.realistic_style) : null,
    penColor: s.pen_color ? sqlToString(s.pen_color) : null,
    handwritingSize: sqlToString(s.handwriting_size),
    lineSpacing: sqlToNumber(s.line_spacing),
    wordSpacing: sqlToNumber(s.word_spacing),
    characterSpacing: sqlToNumber(s.character_spacing),
    margins: {
      top: sqlToNumber(s.margins_top),
      right: sqlToNumber(s.margins_right),
      bottom: sqlToNumber(s.margins_bottom),
      left: sqlToNumber(s.margins_left),
    },
    penThickness: sqlToNumber(s.pen_thickness),
    questionStartMode: sqlToString(s.question_start_mode),
    showQuestionNumbers: Boolean(s.show_question_numbers),
    showPageNumbers: Boolean(s.show_page_numbers),
    paperStyle: sqlToString(s.paper_style),
    pageSize: sqlToString(s.page_size),
    isDefault: Boolean(s.is_default),
    createdAt: sqlToString(s.created_at),
    updatedAt: sqlToString(s.updated_at),
  }));

  res.json({ settings: formatted });
}));

router.put('/handwriting/generation-settings/:id', authMiddleware, asyncHandler(async (req, res) => {
  const settings = queries.getGenerationSettingsById(req.params.id);
  if (!settings || sqlToString(settings.user_id) !== req.user!.id) {
    throw new AppError(404, 'Settings not found');
  }

  const { name, description, handwritingMode, realisticStyle, penColor, isDefault, ...updateData } = req.body;
  const dbUpdates: any = {};

  if (name) dbUpdates.name = name;
  if (description !== undefined) dbUpdates.description = description;
  if (handwritingMode) dbUpdates.handwriting_mode = handwritingMode;
  if (realisticStyle) dbUpdates.realistic_style = realisticStyle;
  if (penColor) dbUpdates.pen_color = penColor;
  if (isDefault !== undefined) dbUpdates.is_default = isDefault ? 1 : 0;

  // Map camelCase to snake_case
  const fieldMap: Record<string, string> = {
    handwritingSize: 'handwriting_size',
    lineSpacing: 'line_spacing',
    wordSpacing: 'word_spacing',
    characterSpacing: 'character_spacing',
    marginsTop: 'margins_top',
    marginsRight: 'margins_right',
    marginsBottom: 'margins_bottom',
    marginsLeft: 'margins_left',
    penThickness: 'pen_thickness',
    questionStartMode: 'question_start_mode',
    showQuestionNumbers: 'show_question_numbers',
    showPageNumbers: 'show_page_numbers',
    paperStyle: 'paper_style',
    pageSize: 'page_size',
  };

  for (const [key, value] of Object.entries(updateData)) {
    if (fieldMap[key]) {
      dbUpdates[fieldMap[key]] = value;
    }
  }

  // Handle margins object
  if (updateData.margins) {
    if (updateData.margins.top !== undefined) dbUpdates.margins_top = updateData.margins.top;
    if (updateData.margins.right !== undefined) dbUpdates.margins_right = updateData.margins.right;
    if (updateData.margins.bottom !== undefined) dbUpdates.margins_bottom = updateData.margins.bottom;
    if (updateData.margins.left !== undefined) dbUpdates.margins_left = updateData.margins.left;
  }

  queries.updateGenerationSettings(req.params.id, dbUpdates);

  if (isDefault) {
    queries.setDefaultGenerationSettings(req.user!.id, req.params.id);
  }

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'generation_settings_updated',
    title: 'Generation Settings Updated',
    description: `Updated "${name || sqlToString(settings.name)}" preset`,
  });

  const updated = queries.getGenerationSettingsById(req.params.id);
  res.json({
    settings: {
      id: sqlToString(updated!.id),
      userId: sqlToString(updated!.user_id),
      name: sqlToString(updated!.name),
      description: updated!.description ? sqlToString(updated!.description) : null,
      handwritingMode: sqlToString(updated!.handwriting_mode),
      realisticStyle: updated!.realistic_style ? sqlToString(updated!.realistic_style) : null,
      penColor: updated!.pen_color ? sqlToString(updated!.pen_color) : null,
      handwritingSize: sqlToString(updated!.handwriting_size),
      lineSpacing: sqlToNumber(updated!.line_spacing),
      wordSpacing: sqlToNumber(updated!.word_spacing),
      characterSpacing: sqlToNumber(updated!.character_spacing),
      margins: {
        top: sqlToNumber(updated!.margins_top),
        right: sqlToNumber(updated!.margins_right),
        bottom: sqlToNumber(updated!.margins_bottom),
        left: sqlToNumber(updated!.margins_left),
      },
      penThickness: sqlToNumber(updated!.pen_thickness),
      questionStartMode: sqlToString(updated!.question_start_mode),
      showQuestionNumbers: Boolean(updated!.show_question_numbers),
      showPageNumbers: Boolean(updated!.show_page_numbers),
      paperStyle: sqlToString(updated!.paper_style),
      pageSize: sqlToString(updated!.page_size),
      isDefault: Boolean(updated!.is_default),
      createdAt: sqlToString(updated!.created_at),
      updatedAt: sqlToString(updated!.updated_at),
    },
  });
}));

router.delete('/handwriting/generation-settings/:id', authMiddleware, asyncHandler(async (req, res) => {
  const settings = queries.getGenerationSettingsById(req.params.id);
  if (!settings || sqlToString(settings.user_id) !== req.user!.id) {
    throw new AppError(404, 'Settings not found');
  }

  queries.deleteGenerationSettings(req.params.id);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'generation_settings_deleted',
    title: 'Generation Settings Deleted',
    description: `Deleted "${sqlToString(settings.name)}" preset`,
  });

  res.json({ message: 'Settings deleted successfully' });
}));

// Handwriting Generation
router.post('/handwriting/generate', authMiddleware, asyncHandler(async (req, res) => {
  const { assignmentId, handwritingProfileId, generationSettingsId, mode, realisticOptions, forgeOptions } = req.body;

  if (!assignmentId || !handwritingProfileId || !mode) {
    throw new AppError(400, 'Assignment ID, handwriting profile ID, and mode are required');
  }

  const assignment = queries.getAssignmentById(assignmentId);
  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  const profile = queries.getHandwritingProfileById(handwritingProfileId);
  if (!profile || sqlToString(profile.user_id) !== req.user!.id) {
    throw new AppError(404, 'Handwriting profile not found');
  }

  const questions = JSON.parse(sqlToString(assignment.questions));
  const answers = assignment.answers ? JSON.parse(sqlToString(assignment.answers)) : [];
  const settings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};

  // Get generation settings if provided
  let generationSettings: any = undefined;
  if (generationSettingsId) {
    const gs = queries.getGenerationSettingsById(generationSettingsId);
    if (gs && sqlToString(gs.user_id) === req.user!.id) {
      generationSettings = {
        id: sqlToString(gs.id),
        userId: sqlToString(gs.user_id),
        name: sqlToString(gs.name),
        handwritingMode: sqlToString(gs.handwriting_mode),
        realisticStyle: gs.realistic_style ? sqlToString(gs.realistic_style) : undefined,
        penColor: gs.pen_color ? sqlToString(gs.pen_color) : undefined,
        handwritingSize: sqlToString(gs.handwriting_size),
        lineSpacing: sqlToNumber(gs.line_spacing),
        wordSpacing: sqlToNumber(gs.word_spacing),
        characterSpacing: sqlToNumber(gs.character_spacing),
        margins: {
          top: sqlToNumber(gs.margins_top),
          right: sqlToNumber(gs.margins_right),
          bottom: sqlToNumber(gs.margins_bottom),
          left: sqlToNumber(gs.margins_left),
        },
        penThickness: sqlToNumber(gs.pen_thickness),
        questionStartMode: sqlToString(gs.question_start_mode),
        showQuestionNumbers: Boolean(gs.show_question_numbers),
        showPageNumbers: Boolean(gs.show_page_numbers),
        paperStyle: sqlToString(gs.paper_style),
        pageSize: sqlToString(gs.page_size),
        isDefault: Boolean(gs.is_default),
      };
    }
  }

  // Get samples for personal mode
  let samples: any[] = [];
  if (mode === 'personal') {
    const sampleRecords = queries.getHandwritingSamplesByProfile(handwritingProfileId);
    samples = sampleRecords.map(s => ({
      id: sqlToString(s.id),
      profileId: sqlToString(s.profile_id),
      userId: sqlToString(s.user_id),
      imageUrl: sqlToString(s.image_url),
      analyzedImageUrl: s.analyzed_image_url ? sqlToString(s.analyzed_image_url) : undefined,
      characteristics: s.characteristics ? JSON.parse(sqlToString(s.characteristics)) : undefined,
      qualityScore: s.quality_score,
      isPrimary: Boolean(s.is_primary),
      orderIndex: s.order_index,
      createdAt: sqlToString(s.created_at),
    }));
  }

  // Create generation job
  const generationService = getHandwritingGenerationService();
  const job = await generationService.createGenerationJob(req.user!.id, {
    assignment: {
      id: sqlToString(assignment.id),
      userId: sqlToString(assignment.user_id),
      title: sqlToString(assignment.title),
      subject: sqlToString(assignment.subject),
      level: sqlToString(assignment.level) as any,
      questions,
      answers,
      handwritingProfileId: sqlToString(assignment.handwriting_profile_id),
      paperStyle: sqlToString(assignment.paper_style) as any,
      pageSize: sqlToString(assignment.page_size) as any,
      settings,
      status: sqlToString(assignment.status) as any,
      totalPages: sqlToNumber(assignment.total_pages),
      pdfUrl: assignment.pdf_url ? sqlToString(assignment.pdf_url) : undefined,
      docxUrl: assignment.docx_url ? sqlToString(assignment.docx_url) : undefined,
      createdAt: sqlToString(assignment.created_at),
      updatedAt: sqlToString(assignment.updated_at),
    },
    questions,
    answers,
    profile: {
      id: sqlToString(profile.id),
      userId: sqlToString(profile.user_id),
      name: sqlToString(profile.name),
      originalImageUrl: sqlToString(profile.original_image_url),
      analyzedImageUrl: profile.analyzed_image_url ? sqlToString(profile.analyzed_image_url) : undefined,
      characteristics: JSON.parse(sqlToString(profile.characteristics)),
      samples: samples || [],
      status: sqlToString(profile.status) as any,
      isActive: Boolean(profile.is_active),
      mode: sqlToString(profile.mode) as any,
      realisticStyle: profile.realistic_style ? sqlToString(profile.realistic_style) as any : undefined,
      penColor: profile.pen_color ? sqlToString(profile.pen_color) as any : undefined,
      createdAt: sqlToString(profile.created_at),
      updatedAt: sqlToString(profile.updated_at),
    },
    samples,
    settings,
    generationSettings,
    mode,
    realisticOptions,
    forgeOptions,
  });

  // Start generation asynchronously
  generationService.startGenerationJob(job.id);

  res.status(202).json({
    job: {
      id: job.id,
      status: job.status,
      mode: job.mode,
      createdAt: job.createdAt,
    },
  });
}));

router.get('/handwriting/generate/:jobId', authMiddleware, asyncHandler(async (req, res) => {
  const job = queries.getGeneratedAssignmentById(req.params.jobId);
  if (!job || sqlToString(job.user_id) !== req.user!.id) {
    throw new AppError(404, 'Generation job not found');
  }

  const pages = queries.getGeneratedPagesByAssignment(req.params.jobId);

  // Helper to safely parse JSON from database (handles null, "null" string, and empty string)
  const safeJsonParse = (val: any) => {
    const str = sqlToString(val);
    if (!str || str === 'null' || str === '') return undefined;
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  };

  res.json({
    job: {
      id: sqlToString(job.id),
      userId: sqlToString(job.user_id),
      assignmentId: job.assignment_id ? sqlToString(job.assignment_id) : null,
      handwritingProfileId: job.handwriting_profile_id ? sqlToString(job.handwriting_profile_id) : null,
      generationSettingsId: job.generation_settings_id ? sqlToString(job.generation_settings_id) : null,
      status: sqlToString(job.status),
      mode: sqlToString(job.mode),
      totalPages: sqlToNumber(job.total_pages),
      pagesData: safeJsonParse(job.pages_data),
      pdfUrl: job.pdf_url ? sqlToString(job.pdf_url) : null,
      docxUrl: job.docx_url ? sqlToString(job.docx_url) : null,
      forgeMetadata: safeJsonParse(job.forge_metadata),
      errorMessage: job.error_message ? sqlToString(job.error_message) : null,
      generationTimeMs: sqlToNumber(job.generation_time_ms),
      createdAt: sqlToString(job.created_at),
      updatedAt: sqlToString(job.updated_at),
      pages: pages.map(p => ({
        id: sqlToString(p.id),
        generatedAssignmentId: sqlToString(p.generated_assignment_id),
        pageNumber: sqlToNumber(p.page_number),
        htmlContent: sqlToString(p.html_content),
        imageUrl: p.image_url ? sqlToString(p.image_url) : null,
        width: sqlToNumber(p.width),
        height: sqlToNumber(p.height),
        createdAt: sqlToString(p.created_at),
      })),
    },
  });
}));

router.post('/handwriting/generate/:jobId/cancel', authMiddleware, asyncHandler(async (req, res) => {
  const job = queries.getGeneratedAssignmentById(req.params.jobId);
  if (!job || sqlToString(job.user_id) !== req.user!.id) {
    throw new AppError(404, 'Generation job not found');
  }

  const generationService = getHandwritingGenerationService();
  const cancelled = await generationService.cancelGenerationJob(req.params.jobId);

  if (!cancelled) {
    throw new AppError(400, 'Cannot cancel job - not in progress');
  }

  res.json({ message: 'Generation cancelled' });
}));

// Retry failed generation job
router.post('/handwriting/jobs/:jobId/retry', authMiddleware, asyncHandler(async (req, res) => {
  const generationService = getHandwritingGenerationService();

  // Check if job exists and is failed
  const job = queries.getGeneratedAssignmentById(req.params.jobId);
  if (!job) {
    throw new AppError(404, 'Generation job not found');
  }

  if (job.user_id !== req.user!.id) {
    throw new AppError(403, 'Unauthorized: Cannot retry another user\'s job');
  }

  if (job.status !== 'failed' && job.status !== 'cancelled') {
    throw new AppError(400, `Cannot retry job with status: ${job.status}`);
  }

  const newJob = await generationService.retryGenerationJob(
    req.params.jobId,
    req.user!.id
  );

  res.status(201).json({
    message: 'Generation job retried',
    job: newJob,
  });
}));

// Forge API Status
router.get('/handwriting/forge/status', authMiddleware, asyncHandler(async (req, res) => {
  const forgeClient = getForgeClient();
  const health = await forgeClient.checkHealth();
  const models = await forgeClient.getModels();

  res.json({
    healthy: health.status !== 'unhealthy',
    status: health.status,
    version: health.version,
    modelsLoaded: health.modelsLoaded,
    availableModels: models,
    lastCheck: health.timestamp,
  });
}));

router.post('/handwriting/forge/check', authMiddleware, asyncHandler(async (req, res) => {
  const forgeClient = getForgeClient();
  const health = await forgeClient.checkHealth();

  res.json({
    healthy: health.status !== 'unhealthy',
    status: health.status,
    timestamp: health.timestamp,
  });
}));

// Realistic Handwriting Options
router.get('/handwriting/realistic/options', authMiddleware, asyncHandler(async (req, res) => {
  const generationService = getHandwritingGenerationService();
  const styles = generationService.getAvailableStyles();
  const penColors = generationService.getAvailablePenColors();

  res.json({
    styles,
    penColors,
    paperStyles: [
      { id: 'ruled', name: 'Ruled Notebook', description: 'Classic lined paper with margins' },
      { id: 'plain', name: 'Plain White', description: 'Clean white paper without lines' },
      { id: 'grid', name: 'Grid Paper', description: 'Graph paper for diagrams and math' },
    ],
    variationLevels: [
      { id: 'low', name: 'Low', description: 'Subtle natural variations' },
      { id: 'medium', name: 'Medium', description: 'Balanced natural variations' },
      { id: 'high', name: 'High', description: 'Pronounced natural variations' },
    ],
  });
}));

// Generated Assignments History
router.get('/handwriting/generated', authMiddleware, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const generated = queries.getGeneratedAssignmentsByUser(req.user!.id, limit, offset);
  const formatted = generated.map(g => ({
    id: sqlToString(g.id),
    userId: sqlToString(g.user_id),
    assignmentId: g.assignment_id ? sqlToString(g.assignment_id) : null,
    handwritingProfileId: g.handwriting_profile_id ? sqlToString(g.handwriting_profile_id) : null,
    generationSettingsId: g.generation_settings_id ? sqlToString(g.generation_settings_id) : null,
    status: sqlToString(g.status),
    mode: sqlToString(g.mode),
    totalPages: sqlToNumber(g.total_pages),
    pdfUrl: g.pdf_url ? sqlToString(g.pdf_url) : null,
    docxUrl: g.docx_url ? sqlToString(g.docx_url) : null,
    forgeMetadata: g.forge_metadata ? JSON.parse(sqlToString(g.forge_metadata)) : null,
    errorMessage: g.error_message ? sqlToString(g.error_message) : null,
    generationTimeMs: sqlToNumber(g.generation_time_ms),
    createdAt: sqlToString(g.created_at),
    updatedAt: sqlToString(g.updated_at),
  }));

  res.json({ data: formatted });
}));

// ==================== ASSIGNMENT ROUTES ====================

// Default assignment settings (matching frontend defaults)
const defaultAssignmentSettings = {
  handwritingSize: 'medium',
  lineSpacing: 1.0,
  wordSpacing: 1.0,
  characterSpacing: 1.0,
  margins: { top: 80, right: 60, bottom: 80, left: 60 },
  penThickness: 1.0,
  questionStartMode: 'continuous',
  showQuestionNumbers: true,
  showPageNumbers: true,
};

router.post('/assignments', authMiddleware, asyncHandler(async (req, res) => {
  const { title, subject, level, questions, handwritingProfileId, paperStyle, pageSize, settings } = req.body;

  if (!title || !subject || !level || !questions || !handwritingProfileId) {
    throw new AppError(400, 'Missing required fields');
  }

  const assignmentId = uuidv4();
  const userId = req.user!.id;

  // Merge provided settings with defaults
  const mergedSettings = { ...defaultAssignmentSettings, ...settings };

  queries.createAssignment({
    id: assignmentId,
    user_id: userId,
    title,
    subject,
    level,
    questions: JSON.stringify(questions),
    handwriting_profile_id: handwritingProfileId,
    paper_style: paperStyle || 'ruled',
    page_size: pageSize || 'A4',
    settings: JSON.stringify(mergedSettings),
  });

  queries.logActivity({
    id: uuidv4(),
    user_id: userId,
    type: 'assignment_created',
    title: 'Assignment Created',
    description: `Created "${title}"`,
  });

  res.status(201).json({
    assignment: {
      id: assignmentId,
      userId,
      title,
      subject,
      level,
      questions,
      handwritingProfileId,
      paperStyle: paperStyle || 'ruled',
      pageSize: pageSize || 'A4',
      settings: mergedSettings,
      status: 'draft',
      totalPages: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}));

router.get('/assignments', authMiddleware, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const assignments = queries.getAssignmentsByUser(req.user!.id, limit, offset);

  const formatted = assignments.map(a => ({
    id: sqlToString(a.id),
    userId: sqlToString(a.user_id),
    title: sqlToString(a.title),
    subject: sqlToString(a.subject),
    level: sqlToString(a.level),
    questions: JSON.parse(sqlToString(a.questions)),
    answers: a.answers ? JSON.parse(sqlToString(a.answers)) : [],
    handwritingProfileId: sqlToString(a.handwriting_profile_id),
    paperStyle: sqlToString(a.paper_style),
    pageSize: sqlToString(a.page_size),
    settings: a.settings ? JSON.parse(sqlToString(a.settings)) : {},
    status: sqlToString(a.status),
    totalPages: sqlToNumber(a.total_pages),
    pdfUrl: a.pdf_url ? sqlToString(a.pdf_url) : null,
    docxUrl: a.docx_url ? sqlToString(a.docx_url) : null,
    createdAt: sqlToString(a.created_at),
    updatedAt: sqlToString(a.updated_at),
  }));

  res.json({ data: formatted });
}));

router.get('/assignments/:id', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  res.json({
    assignment: {
      id: sqlToString(assignment.id),
      userId: sqlToString(assignment.user_id),
      title: sqlToString(assignment.title),
      subject: sqlToString(assignment.subject),
      level: sqlToString(assignment.level),
      questions: JSON.parse(sqlToString(assignment.questions)),
      answers: assignment.answers ? JSON.parse(sqlToString(assignment.answers)) : [],
      handwritingProfileId: sqlToString(assignment.handwriting_profile_id),
      paperStyle: sqlToString(assignment.paper_style),
      pageSize: sqlToString(assignment.page_size),
      settings: assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {},
      status: sqlToString(assignment.status),
      totalPages: sqlToNumber(assignment.total_pages),
      pdfUrl: assignment.pdf_url ? sqlToString(assignment.pdf_url) : null,
      docxUrl: assignment.docx_url ? sqlToString(assignment.docx_url) : null,
      createdAt: sqlToString(assignment.created_at),
      updatedAt: sqlToString(assignment.updated_at),
    },
  });
}));

router.put('/assignments/:id', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  const updates: any = {};
  const allowedFields = ['title', 'subject', 'level', 'questions', 'answers', 'paper_style', 'page_size', 'status', 'total_pages', 'pdf_url', 'docx_url'];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if ((field === 'questions' || field === 'answers') && typeof req.body[field] !== 'string') {
        updates[field] = JSON.stringify(req.body[field]);
      } else {
        updates[field] = req.body[field];
      }
    }
  }

  // Handle settings separately - merge with existing settings
  if (req.body.settings !== undefined) {
    const existingSettings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};
    updates.settings = JSON.stringify({ ...defaultAssignmentSettings, ...existingSettings, ...req.body.settings });
  }

  queries.updateAssignment(req.params.id, updates);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'assignment_updated',
    title: 'Assignment Updated',
    description: `Updated "${sqlToString(assignment.title)}"`,
  });

  const updated = queries.getAssignmentById(req.params.id);
  res.json({
    assignment: {
      id: sqlToString(updated!.id),
      userId: sqlToString(updated!.user_id),
      title: sqlToString(updated!.title),
      subject: sqlToString(updated!.subject),
      level: sqlToString(updated!.level),
      questions: JSON.parse(sqlToString(updated!.questions)),
      answers: updated!.answers ? JSON.parse(sqlToString(updated!.answers)) : [],
      handwritingProfileId: sqlToString(updated!.handwriting_profile_id),
      paperStyle: sqlToString(updated!.paper_style),
      pageSize: sqlToString(updated!.page_size),
      settings: updated!.settings ? JSON.parse(sqlToString(updated!.settings)) : {},
      status: sqlToString(updated!.status),
      totalPages: sqlToNumber(updated!.total_pages),
      pdfUrl: updated!.pdf_url ? sqlToString(updated!.pdf_url) : null,
      docxUrl: updated!.docx_url ? sqlToString(updated!.docx_url) : null,
      createdAt: sqlToString(updated!.created_at),
      updatedAt: sqlToString(updated!.updated_at),
    },
  });
}));

router.delete('/assignments/:id', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  queries.deleteAssignment(req.params.id);

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'assignment_deleted',
    title: 'Assignment Deleted',
    description: `Deleted "${sqlToString(assignment.title)}"`,
  });

  res.json({ message: 'Assignment deleted successfully' });
}));

router.post('/assignments/:id/generate', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  // Update status to generating
  queries.updateAssignment(req.params.id, { status: 'generating' });

  queries.logActivity({
    id: uuidv4(),
    user_id: req.user!.id,
    type: 'assignment_generation_started',
    title: 'Answer Generation Started',
    description: `Started generating answers for "${sqlToString(assignment.title)}"`,
  });

  // Parse data
  const questions = JSON.parse(sqlToString(assignment.questions));
  const settings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};
  const subject = sqlToString(assignment.subject);
  const level = sqlToString(assignment.level);

  try {
    // Generate answers using AI
    const answers = await generateAnswers(questions, subject, level, 'medium', settings);

    // Save answers to assignment
    queries.updateAssignment(req.params.id, {
      answers: JSON.stringify(answers),
      status: 'preview',
      total_pages: 0, // Will be calculated on preview
    });

    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'assignment_generation_completed',
      title: 'Answer Generation Completed',
      description: `Generated ${answers.length} answers for "${sqlToString(assignment.title)}"`,
    });

    res.json({ message: 'Generation completed', assignmentId: req.params.id, answers });
  } catch (error) {
    queries.updateAssignment(req.params.id, { status: 'failed' });
    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'assignment_generation_failed',
      title: 'Answer Generation Failed',
      description: `Failed to generate answers for "${sqlToString(assignment.title)}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}));

router.get('/assignments/:id/preview', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  // Get handwriting profile
  const profile = queries.getHandwritingProfileById(sqlToString(assignment.handwriting_profile_id));
  if (!profile) {
    throw new AppError(404, 'Handwriting profile not found');
  }

  // Parse data
  const questions = JSON.parse(sqlToString(assignment.questions));
  const answers = assignment.answers ? JSON.parse(sqlToString(assignment.answers)) : [];
  const storedSettings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};
  // Merge with defaults to ensure all required fields exist
  const settings = { ...defaultAssignmentSettings, ...storedSettings };
  const characteristics = JSON.parse(sqlToString(profile.characteristics));

  // Generate full HTML for preview
  const fullHtml = generateFullHTML(
    {
      id: sqlToString(assignment.id),
      userId: sqlToString(assignment.user_id),
      title: sqlToString(assignment.title),
      subject: sqlToString(assignment.subject),
      level: sqlToString(assignment.level) as 'school' | 'college' | 'university' | 'professional',
      questions,
      answers,
      handwritingProfileId: sqlToString(assignment.handwriting_profile_id),
      paperStyle: sqlToString(assignment.paper_style) as PaperStyle,
      pageSize: sqlToString(assignment.page_size) as PageSize,
      settings,
      status: sqlToString(assignment.status) as 'draft' | 'generating' | 'preview' | 'completed' | 'failed',
      totalPages: sqlToNumber(assignment.total_pages),
      pdfUrl: assignment.pdf_url ? sqlToString(assignment.pdf_url) : undefined,
      docxUrl: assignment.docx_url ? sqlToString(assignment.docx_url) : undefined,
      createdAt: sqlToString(assignment.created_at),
      updatedAt: sqlToString(assignment.updated_at),
    },
    questions,
    answers,
    { characteristics },
    settings
  );

  // Set CSP header to prevent XSS - no inline scripts, no eval, no external scripts
  const cspHeader = "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
  res.setHeader('Content-Security-Policy', cspHeader);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Type', 'text/html');
  res.send(fullHtml);
}));

router.get('/assignments/:id/pdf', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  // Get handwriting profile
  const profile = queries.getHandwritingProfileById(sqlToString(assignment.handwriting_profile_id));
  if (!profile) {
    throw new AppError(404, 'Handwriting profile not found');
  }

  // Parse data
  const questions = JSON.parse(sqlToString(assignment.questions));
  const answers = assignment.answers ? JSON.parse(sqlToString(assignment.answers)) : [];
  const storedSettings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};
  // Merge with defaults to ensure all required fields exist
  const settings = { ...defaultAssignmentSettings, ...storedSettings };
  const characteristics = JSON.parse(sqlToString(profile.characteristics));

  // Generate PDF using headless browser
  const pdfBuffer = await generateAssignmentPDF({
    assignment: {
      id: sqlToString(assignment.id),
      userId: sqlToString(assignment.user_id),
      title: sqlToString(assignment.title),
      subject: sqlToString(assignment.subject),
      level: sqlToString(assignment.level) as 'school' | 'college' | 'university' | 'professional',
      questions,
      answers,
      handwritingProfileId: sqlToString(assignment.handwriting_profile_id),
      paperStyle: sqlToString(assignment.paper_style) as PaperStyle,
      pageSize: sqlToString(assignment.page_size) as PageSize,
      settings,
      status: sqlToString(assignment.status) as 'draft' | 'generating' | 'preview' | 'completed' | 'failed',
      totalPages: sqlToNumber(assignment.total_pages),
      pdfUrl: assignment.pdf_url ? sqlToString(assignment.pdf_url) : undefined,
      docxUrl: assignment.docx_url ? sqlToString(assignment.docx_url) : undefined,
      createdAt: sqlToString(assignment.created_at),
      updatedAt: sqlToString(assignment.updated_at),
    },
    questions,
    answers,
    handwritingProfile: { characteristics },
    settings
  });

  // Update assignment with PDF URL
  const pdfFilename = `assignment-${assignment.id}-${Date.now()}.pdf`;
  queries.updateAssignment(sqlToString(assignment.id), { pdf_url: pdfFilename, status: 'completed' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sqlToString(assignment.title).replace(/[^a-z0-9]/gi, '_')}.pdf"`);
  res.send(pdfBuffer);
}));

router.get('/assignments/:id/docx', authMiddleware, asyncHandler(async (req, res) => {
  const assignment = queries.getAssignmentById(req.params.id);

  if (!assignment || sqlToString(assignment.user_id) !== req.user!.id) {
    throw new AppError(404, 'Assignment not found');
  }

  // Get handwriting profile
  const profile = queries.getHandwritingProfileById(sqlToString(assignment.handwriting_profile_id));
  if (!profile) {
    throw new AppError(404, 'Handwriting profile not found');
  }

  // Parse data
  const questions = JSON.parse(sqlToString(assignment.questions));
  const answers = assignment.answers ? JSON.parse(sqlToString(assignment.answers)) : [];
  const storedSettings = assignment.settings ? JSON.parse(sqlToString(assignment.settings)) : {};
  // Merge with defaults to ensure all required fields exist
  const settings = { ...defaultAssignmentSettings, ...storedSettings };
  const characteristics = JSON.parse(sqlToString(profile.characteristics));

  // Generate DOCX
  const docxBuffer = await generateAssignmentDOCX({
    assignment: {
      id: sqlToString(assignment.id),
      userId: sqlToString(assignment.user_id),
      title: sqlToString(assignment.title),
      subject: sqlToString(assignment.subject),
      level: sqlToString(assignment.level) as 'school' | 'college' | 'university' | 'professional',
      questions,
      answers,
      handwritingProfileId: sqlToString(assignment.handwriting_profile_id),
      paperStyle: sqlToString(assignment.paper_style) as PaperStyle,
      pageSize: sqlToString(assignment.page_size) as PageSize,
      settings,
      status: sqlToString(assignment.status) as 'draft' | 'generating' | 'preview' | 'completed' | 'failed',
      totalPages: sqlToNumber(assignment.total_pages),
      pdfUrl: assignment.pdf_url ? sqlToString(assignment.pdf_url) : undefined,
      docxUrl: assignment.docx_url ? sqlToString(assignment.docx_url) : undefined,
      createdAt: sqlToString(assignment.created_at),
      updatedAt: sqlToString(assignment.updated_at),
    },
    questions,
    answers,
    handwritingProfile: { characteristics },
    settings
  });

  // Update assignment with DOCX URL
  const docxFilename = `assignment-${assignment.id}-${Date.now()}.docx`;
  queries.updateAssignment(sqlToString(assignment.id), { docx_url: docxFilename });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${sqlToString(assignment.title).replace(/[^a-z0-9]/gi, '_')}.docx"`);
  res.send(docxBuffer);
}));

// ==================== AI ROUTES ====================
router.post('/ai/generate-answer', authMiddleware, asyncHandler(async (req, res) => {
  const { question, subject, level, length } = req.body;

  if (!question || !subject || !level || !length) {
    throw new AppError(400, 'Missing required fields');
  }

  // Generate real answer using OpenAI
  const questionObj = {
    id: `q-${Date.now()}`,
    text: question,
    type: length as 'short' | 'medium' | 'detailed' | 'essay',
    subject,
    order: 0,
    estimatedLength: length === 'short' ? 50 : length === 'medium' ? 200 : 500,
  };

  const { answer, tokensUsed } = await generateAnswer(questionObj, subject, level, length);

  res.json({
    answer,
    tokensUsed,
  });
}));

router.post('/ai/generate-answers', authMiddleware, asyncHandler(async (req, res) => {
  const { questions, subject, level, handwritingProfileId } = req.body;

  if (!questions || !Array.isArray(questions)) {
    throw new AppError(400, 'Questions array required');
  }

  // Determine length from first question or default to medium
  const length = questions[0]?.type === 'short' ? 'short' : questions[0]?.type === 'detailed' ? 'detailed' : 'medium';

  // Generate real answers using OpenAI
  const questionObjs = questions.map((q: any) => ({
    id: q.id,
    text: q.text,
    type: q.type || 'medium',
    subject: q.subject || subject,
    order: q.order || 0,
    estimatedLength: q.estimatedLength || 200,
  }));

  const answers = await generateAnswers(questionObjs, subject, level, length);

  res.json({ answers });
}));

router.post('/ai/ocr', authMiddleware, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No image file provided');
  }

  const imagePath = path.join(config.upload.uploadDir, req.file.filename);

  if (!fs.existsSync(imagePath)) {
    throw new AppError(404, 'Image file not found');
  }

  try {
    // Perform real OCR using Tesseract
    const ocrResult = await performOCR(imagePath);

    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'ocr_completed',
      title: 'OCR Completed',
      description: `Extracted text from "${req.file.originalname}"`,
      metadata: JSON.stringify({
        confidence: ocrResult.confidence,
        textLength: ocrResult.text.length,
      }),
    });

    res.json({
      text: ocrResult.text,
      confidence: ocrResult.confidence / 100, // Convert to 0-1 range
      blocks: ocrResult.blocks,
      lines: ocrResult.lines,
      words: ocrResult.words,
    });
  } catch (error) {
    queries.logActivity({
      id: uuidv4(),
      user_id: req.user!.id,
      type: 'ocr_failed',
      title: 'OCR Failed',
      description: `OCR failed for "${req.file.originalname}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw new AppError(500, `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

router.get('/ai/subjects', asyncHandler(async (req, res) => {
  const subjects = [
    { id: 'mathematics', name: 'Mathematics', icon: 'calculator' },
    { id: 'physics', name: 'Physics', icon: 'atom' },
    { id: 'chemistry', name: 'Chemistry', icon: 'flask-conical' },
    { id: 'biology', name: 'Biology', icon: 'dna' },
    { id: 'computer-science', name: 'Computer Science', icon: 'cpu' },
    { id: 'english', name: 'English', icon: 'book-open' },
    { id: 'history', name: 'History', icon: 'landmark' },
    { id: 'geography', name: 'Geography', icon: 'globe' },
    { id: 'economics', name: 'Economics', icon: 'trending-up' },
    { id: 'other', name: 'Other', icon: 'folder' },
  ];
  res.json({ subjects });
}));

// ==================== DASHBOARD ROUTES ====================
router.get('/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  // Use queries helpers instead of direct sql.js
  const totalAssignments = sqlToNumber(queries.get('SELECT COUNT(*) as count FROM assignments WHERE user_id = ?', [userId])?.count) || 0;
  const completedAssignments = sqlToNumber(queries.get('SELECT COUNT(*) as count FROM assignments WHERE user_id = ? AND status = "completed"', [userId])?.count) || 0;
  const draftAssignments = sqlToNumber(queries.get('SELECT COUNT(*) as count FROM assignments WHERE user_id = ? AND status = "draft"', [userId])?.count) || 0;
  const totalPages = sqlToNumber(queries.get('SELECT SUM(total_pages) as sum FROM assignments WHERE user_id = ?', [userId])?.sum) || 0;
  const handwritingProfiles = sqlToNumber(queries.get('SELECT COUNT(*) as count FROM handwriting_profiles WHERE user_id = ?', [userId])?.count) || 0;

  const recentActivity = queries.getUserActivity(userId, 10);

  res.json({
    totalAssignments,
    completedAssignments,
    draftAssignments,
    totalPages,
    handwritingProfiles,
    recentActivity: recentActivity.map(a => ({
      id: sqlToString(a.id),
      type: sqlToString(a.type),
      title: sqlToString(a.title),
      description: a.description ? sqlToString(a.description) : null,
      timestamp: a.created_at ? sqlToString(a.created_at) : null,
      metadata: a.metadata ? JSON.parse(sqlToString(a.metadata)) : null,
    })),
  });
}));

router.get('/dashboard/recent', authMiddleware, asyncHandler(async (req, res) => {
  const assignments = queries.getAssignmentsByUser(req.user!.id, 5, 0);

  const formatted = assignments.map(a => ({
    id: sqlToString(a.id),
    userId: sqlToString(a.user_id),
    title: sqlToString(a.title),
    subject: sqlToString(a.subject),
    level: sqlToString(a.level),
    questions: JSON.parse(sqlToString(a.questions)),
    answers: a.answers ? JSON.parse(sqlToString(a.answers)) : [],
    handwritingProfileId: sqlToString(a.handwriting_profile_id),
    paperStyle: sqlToString(a.paper_style),
    pageSize: sqlToString(a.page_size),
    settings: a.settings ? JSON.parse(sqlToString(a.settings)) : {},
    status: sqlToString(a.status),
    totalPages: sqlToNumber(a.total_pages),
    pdfUrl: a.pdf_url ? sqlToString(a.pdf_url) : null,
    docxUrl: a.docx_url ? sqlToString(a.docx_url) : null,
    createdAt: sqlToString(a.created_at),
    updatedAt: sqlToString(a.updated_at),
  }));

  res.json({ data: formatted });
}));

router.get('/dashboard/activity', authMiddleware, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const activity = queries.getUserActivity(req.user!.id, limit);

  res.json({
    data: activity.map(a => ({
      id: sqlToString(a.id),
      type: sqlToString(a.type),
      title: sqlToString(a.title),
      description: a.description ? sqlToString(a.description) : null,
      timestamp: a.created_at ? sqlToString(a.created_at) : null,
      metadata: a.metadata ? JSON.parse(sqlToString(a.metadata)) : null,
    })),
  });
}));

// ==================== FILE ROUTES ====================
router.post('/files/upload', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No file provided');
  }

  const { purpose = 'general' } = req.body;
  const fileId = uuidv4();
  const fileUrl = `/uploads/${req.file.filename}`;

  queries.createFile({
    id: fileId,
    user_id: req.user!.id,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    purpose,
  });

  res.status(201).json({
    file: {
      id: fileId,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      purpose,
    },
  });
}));

router.delete('/files/:id', authMiddleware, asyncHandler(async (req, res) => {
  // TODO: Implement file deletion
  res.json({ message: 'File deleted' });
}));

// ==================== SETTINGS ROUTES ====================
router.get('/settings', authMiddleware, asyncHandler(async (req, res) => {
  const settingsResult = queries.getUserSettings(req.user!.id);
  let parsedSettings = {};
  if (settingsResult && settingsResult.settings) {
    parsedSettings = JSON.parse(sqlToString(settingsResult.settings));
  }
  res.json({ settings: parsedSettings });
}));

router.put('/settings', authMiddleware, asyncHandler(async (req, res) => {
  queries.updateUserSettings(req.user!.id, JSON.stringify(req.body));
  res.json({ settings: req.body });
}));

// ==================== HEALTH ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export function setupRoutes(app: any) {
  app.use('/api', router);

  // Serve uploaded files
  app.use('/uploads', express.static(config.upload.uploadDir));
}
