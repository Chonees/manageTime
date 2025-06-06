const TaskTemplate = require('../models/taskTemplate.model');

/**
 * Crear nueva plantilla de tarea
 */
exports.createTaskTemplate = async (req, res) => {
  try {
    console.log('Recibiendo solicitud createTaskTemplate con body:', JSON.stringify(req.body));
    console.log('Usuario autenticado userId:', req.userId);
    
    // El ID del usuario se extrae del token JWT - Verificar explícitamente
    const userId = req.userId;
    console.log('Tipo de userId:', typeof userId);
    
    if (!userId) {
      console.error('Error: No se encontró ID de usuario en el token');
      return res.status(401).json({ message: 'No se encontró ID de usuario en el token' });
    }
    
    // Intento de conversión a ObjectId válido para MongoDB
    let validObjectId;
    try {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(userId)) {
        validObjectId = userId;
        console.log('userId es un ObjectId válido');
      } else {
        console.error('userId NO es un ObjectId válido:', userId);
        return res.status(400).json({ message: 'ID de usuario inválido' });
      }
    } catch (objectIdError) {
      console.error('Error al validar ObjectId:', objectIdError);
      return res.status(400).json({ message: 'Error al procesar ID de usuario' });
    }
    
    // Verificar campos requeridos
    if (!req.body.name || !req.body.title) {
      const missingFields = [];
      if (!req.body.name) missingFields.push('name');
      if (!req.body.title) missingFields.push('title');
      
      console.error(`Error: Faltan campos requeridos: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        message: `Faltan campos requeridos: ${missingFields.join(', ')}` 
      });
    }
    
    // Crear la plantilla con los datos recibidos
    const templateData = {
      ...req.body,
      userId: validObjectId
    };
    
    console.log('Creando plantilla con datos:', JSON.stringify(templateData));
    
    // Verificar que location tenga el formato correcto si existe
    if (templateData.location) {
      if (!templateData.location.type || !templateData.location.coordinates || 
          !Array.isArray(templateData.location.coordinates) || templateData.location.coordinates.length !== 2) {
        
        console.error('Error: Formato de ubicación incorrecto:', JSON.stringify(templateData.location));
        return res.status(400).json({ message: 'Formato de ubicación incorrecto' });
      }
    }
    
    console.log('Intentando crear instancia de modelo TaskTemplate');
    try {
      const template = new TaskTemplate(templateData);
      console.log('Instancia de modelo creada exitosamente');
      
      // Validar manualmente antes de guardar
      const validationError = template.validateSync();
      if (validationError) {
        console.error('Error de validación manual:', JSON.stringify(validationError.errors));
        const validationErrors = Object.keys(validationError.errors).map(field => {
          return { field, message: validationError.errors[field].message };
        });
        return res.status(400).json({ 
          message: 'Error de validación', 
          errors: validationErrors 
        });
      }
      
      console.log('Validación manual exitosa, intentando guardar...');
      
      const savedTemplate = await template.save();
      console.log('Plantilla guardada exitosamente:', savedTemplate._id);
      res.status(201).json(savedTemplate);
    } catch (modelError) {
      console.error('Error al crear o validar el modelo:', modelError);
      return res.status(400).json({ message: 'Error al procesar datos de plantilla: ' + modelError.message });
    }
  } catch (error) {
    console.error('Error al crear plantilla de tarea (detalle completo):', error);
    // Intentar obtener más información del error
    let errorMessage = 'Error al crear plantilla de tarea';
    if (error.name && error.message) {
      errorMessage += `: ${error.name} - ${error.message}`;
    }
    res.status(500).json({ message: errorMessage });
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
