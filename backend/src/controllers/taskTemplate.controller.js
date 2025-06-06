const TaskTemplate = require('../models/taskTemplate.model');

/**
 * Crear nueva plantilla de tarea
 */
exports.createTaskTemplate = async (req, res) => {
  try {
    // El ID del usuario se extrae del token JWT
    const userId = req.userId;
    
    // Crear la plantilla con los datos recibidos
    const templateData = {
      ...req.body,
      userId: userId
    };
    
    const template = new TaskTemplate(templateData);
    const savedTemplate = await template.save();
    
    res.status(201).json(savedTemplate);
  } catch (error) {
    console.error('Error al crear plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al crear plantilla de tarea' });
  }
};

/**
 * Obtener todas las plantillas del usuario actual
 */
exports.getTaskTemplates = async (req, res) => {
  try {
    // El ID del usuario se extrae del token JWT
    const userId = req.userId;
    
    // Obtener todas las plantillas del usuario
    const templates = await TaskTemplate.find({ userId: userId }).sort('-createdAt');
    
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error al obtener plantillas de tareas:', error);
    res.status(500).json({ message: 'Error al obtener plantillas de tareas' });
  }
};

/**
 * Obtener una plantilla por su ID
 */
exports.getTaskTemplateById = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.userId;
    
    const template = await TaskTemplate.findOne({ _id: templateId, userId: userId });
    
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error al obtener plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al obtener plantilla de tarea' });
  }
};

/**
 * Actualizar una plantilla existente
 */
exports.updateTaskTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.userId;
    
    // Comprobar si la plantilla existe y pertenece al usuario
    const template = await TaskTemplate.findOne({ _id: templateId, userId: userId });
    
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    // Actualizar la plantilla
    const updatedTemplate = await TaskTemplate.findByIdAndUpdate(
      templateId,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error('Error al actualizar plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al actualizar plantilla de tarea' });
  }
};

/**
 * Eliminar una plantilla
 */
exports.deleteTaskTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.userId;
    
    // Comprobar si la plantilla existe y pertenece al usuario
    const template = await TaskTemplate.findOne({ _id: templateId, userId: userId });
    
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    // Eliminar la plantilla
    await TaskTemplate.findByIdAndDelete(templateId);
    
    res.status(200).json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar plantilla de tarea:', error);
    res.status(500).json({ message: 'Error al eliminar plantilla de tarea' });
  }
};
