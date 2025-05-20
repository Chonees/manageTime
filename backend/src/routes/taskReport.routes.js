const express = require('express');
const router = express.Router();
const taskReportController = require('../controllers/taskReport.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes are protected and require admin permissions
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// GET /api/reports/tasks - Generate task-based Excel report
router.get('/tasks', taskReportController.generateTaskReport);

module.exports = router;
