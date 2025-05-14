const TaskTemplate = require('../models/TaskTemplate');

// Crear una nueva plantilla de tarea
exports.createTaskTemplate = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden crear plantillas de tareas' });
    }

    // Crear la plantilla
    const taskTemplateData = {
      ...req.body,
      createdBy: req.user.id // Asignar el ID del usuario que crea la plantilla
    };

    const taskTemplate = new TaskTemplate(taskTemplateData);
    await taskTemplate.save();

    res.status(201).json(taskTemplate);
  } catch (error) {
    console.error('Error al crear plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al crear plantilla de tarea', error: error.message });
  }
};

// Obtener todas las plantillas de tareas creadas por el usuario actual
exports.getTaskTemplates = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden ver plantillas de tareas' });
    }

    // Buscar plantillas creadas por el usuario actual
    const taskTemplates = await TaskTemplate.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json(taskTemplates);
  } catch (error) {
    console.error('Error al obtener plantillas de tareas:', error);
    res.status(500).json({ message: 'Error al obtener plantillas de tareas', error: error.message });
  }
};

// Obtener una plantilla de tarea por ID
exports.getTaskTemplateById = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden ver plantillas de tareas' });
    }

    const taskTemplate = await TaskTemplate.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!taskTemplate) {
      return res.status(404).json({ message: 'Plantilla de tarea no encontrada' });
    }

    res.status(200).json(taskTemplate);
  } catch (error) {
    console.error('Error al obtener plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al obtener plantilla de tarea', error: error.message });
  }
};

// Actualizar una plantilla de tarea
exports.updateTaskTemplate = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden actualizar plantillas de tareas' });
    }

    const taskTemplate = await TaskTemplate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!taskTemplate) {
      return res.status(404).json({ message: 'Plantilla de tarea no encontrada' });
    }

    res.status(200).json(taskTemplate);
  } catch (error) {
    console.error('Error al actualizar plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al actualizar plantilla de tarea', error: error.message });
  }
};

// Eliminar una plantilla de tarea
exports.deleteTaskTemplate = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden eliminar plantillas de tareas' });
    }

    const taskTemplate = await TaskTemplate.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!taskTemplate) {
      return res.status(404).json({ message: 'Plantilla de tarea no encontrada' });
    }

    res.status(200).json({ message: 'Plantilla de tarea eliminada correctamente', id: req.params.id });
  } catch (error) {
    console.error('Error al eliminar plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al eliminar plantilla de tarea', error: error.message });
  }
};
