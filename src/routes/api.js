const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const teacherController = require('../controllers/teacherController');
const externalPanelController = require('../controllers/externalPanelController');
const { getSystemConfig } = require('../../database/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { requireActiveAccess, checkUserAccessStatus } = require('../middleware/demoEnforcer');

// ==========================================
// 0. CONFIGURACIÓN PÚBLICA DEL SISTEMA Y VOCABULARIO
// ==========================================
router.get('/config', async (req, res) => {
  const config = await getSystemConfig();
  res.json({ success: true, ...config });
});

router.get('/vocabulary', async (req, res) => {
  try {
    const { INGA_DOMINO_CONCEPTS, DOMINO_OFFICIAL_SET_28, LEVELS } = require('../../js/vocabulary');
    let dbConcepts = [];
    try {
      dbConcepts = await db.all('SELECT * FROM vocabulario_inga ORDER BY valor_domino ASC');
    } catch (_) {}

    res.json({
      success: true,
      total_concepts: INGA_DOMINO_CONCEPTS.length,
      total_tiles: DOMINO_OFFICIAL_SET_28.length,
      concepts: dbConcepts.length > 0 ? dbConcepts : INGA_DOMINO_CONCEPTS,
      deck_28: DOMINO_OFFICIAL_SET_28,
      levels: LEVELS
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 1. RUTAS DE AUTENTICACIÓN Y CUENTAS
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/auth/recover-password', authController.recoverPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', verifyToken, authController.getMe);

// ==========================================
// 2. RUTAS DEL PANEL ADMINISTRATIVO (ADMINISTRADOR)
// ==========================================
router.get('/admin/stats', verifyToken, requireRole('ADMINISTRADOR'), adminController.getAdminStats);
router.get('/admin/users', verifyToken, requireRole('ADMINISTRADOR'), adminController.getUsers);
router.post('/admin/users', verifyToken, requireRole('ADMINISTRADOR'), adminController.createUser);
router.put('/admin/users/:id', verifyToken, requireRole('ADMINISTRADOR'), adminController.updateUser);
router.patch('/admin/users/:id/status', verifyToken, requireRole('ADMINISTRADOR'), adminController.toggleUserStatus);
router.delete('/admin/users/:id', verifyToken, requireRole('ADMINISTRADOR'), adminController.deleteUser);
router.post('/admin/users/:id/demo', verifyToken, requireRole('ADMINISTRADOR'), adminController.manageDemo);

router.get('/admin/subscriptions', verifyToken, requireRole('ADMINISTRADOR'), adminController.listSubscriptions);
router.post('/admin/subscriptions', verifyToken, requireRole('ADMINISTRADOR'), adminController.manageSubscription);

router.get('/admin/authorized-emails', verifyToken, requireRole('ADMINISTRADOR'), adminController.getAuthorizedEmails);
router.post('/admin/authorized-emails', verifyToken, requireRole('ADMINISTRADOR'), adminController.addAuthorizedEmail);

router.get('/admin/audit-logs', verifyToken, requireRole('ADMINISTRADOR'), adminController.getAuditLogs);
router.get('/admin/settings', verifyToken, requireRole('ADMINISTRADOR'), adminController.getSettings);
router.put('/admin/settings', verifyToken, requireRole('ADMINISTRADOR'), adminController.updateSetting);

// ==========================================
// 3. RUTAS DEL PANEL DEL DOCENTE (DOCENTE O ADMIN)
// ==========================================
router.get('/docente/dashboard', verifyToken, requireRole('DOCENTE', 'ADMINISTRADOR', 'VENDEDOR'), teacherController.getTeacherDashboard);
router.post('/docente/register-student', verifyToken, requireRole('DOCENTE', 'ADMINISTRADOR', 'VENDEDOR'), teacherController.registerStudentByTeacher);

// Alias retrocompatibles para Vendedor
router.get('/seller/dashboard', verifyToken, requireRole('DOCENTE', 'ADMINISTRADOR', 'VENDEDOR'), teacherController.getTeacherDashboard);
router.post('/seller/register-client', verifyToken, requireRole('DOCENTE', 'ADMINISTRADOR', 'VENDEDOR'), teacherController.registerStudentByTeacher);

// ==========================================
// 4. RUTAS DE INTEGRACIÓN CON PANEL EXTERNO
// ==========================================
router.post('/external-panel/sync-user', externalPanelController.handleExternalUserRegistration);
router.get('/external-panel/config', verifyToken, requireRole('ADMINISTRADOR'), externalPanelController.getExternalPanelConfig);

// ==========================================
// 5. RUTAS DEL ESTUDIANTE Y VALIDACIÓN DE ACCESO DE 120 MINUTOS
// ==========================================
router.get('/estudiante/status', verifyToken, async (req, res) => {
  const status = await checkUserAccessStatus(req.user.id);
  res.json({ success: true, status });
});
router.get('/client/status', verifyToken, async (req, res) => {
  const status = await checkUserAccessStatus(req.user.id);
  res.json({ success: true, status });
});

module.exports = router;
