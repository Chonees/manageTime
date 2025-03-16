// Datos simulados para desarrollo y pruebas

// Usuarios de prueba
export const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    isAdmin: true,
    isActive: true,
    createdAt: new Date('2023-01-01').toISOString()
  },
  {
    id: '2',
    username: 'usuario',
    email: 'usuario@example.com',
    isAdmin: false,
    isActive: true,
    createdAt: new Date('2023-01-15').toISOString()
  },
  {
    id: '3',
    username: 'maria',
    email: 'maria@example.com',
    isAdmin: false,
    isActive: true,
    createdAt: new Date('2023-02-10').toISOString()
  },
  {
    id: '4',
    username: 'juan',
    email: 'juan@example.com',
    isAdmin: false,
    isActive: false,
    createdAt: new Date('2023-03-05').toISOString()
  }
];

// Historial de ubicaciones
export const mockLocationHistory = [
  {
    id: '1',
    userId: '2',
    type: 'start',
    latitude: -34.603722,
    longitude: -58.381592,
    timestamp: new Date('2023-03-15T09:00:00').toISOString()
  },
  {
    id: '2',
    userId: '2',
    type: 'end',
    latitude: -34.603922,
    longitude: -58.382592,
    timestamp: new Date('2023-03-15T17:00:00').toISOString()
  },
  {
    id: '3',
    userId: '2',
    type: 'start',
    latitude: -34.604722,
    longitude: -58.383592,
    timestamp: new Date('2023-03-16T08:30:00').toISOString()
  },
  {
    id: '4',
    userId: '2',
    type: 'end',
    latitude: -34.605722,
    longitude: -58.384592,
    timestamp: new Date('2023-03-16T16:45:00').toISOString()
  },
  {
    id: '5',
    userId: '3',
    type: 'start',
    latitude: -34.606722,
    longitude: -58.385592,
    timestamp: new Date('2023-03-15T08:45:00').toISOString()
  },
  {
    id: '6',
    userId: '3',
    type: 'end',
    latitude: -34.607722,
    longitude: -58.386592,
    timestamp: new Date('2023-03-15T17:30:00').toISOString()
  }
];

// Tareas
export const mockTasks = [
  {
    id: '1',
    title: 'Completar informe mensual',
    completed: false,
    userId: '2',
    createdAt: new Date('2023-03-10').toISOString()
  },
  {
    id: '2',
    title: 'Reunión con el equipo',
    completed: true,
    userId: '2',
    createdAt: new Date('2023-03-12').toISOString()
  },
  {
    id: '3',
    title: 'Revisar presupuesto',
    completed: false,
    userId: '3',
    createdAt: new Date('2023-03-14').toISOString()
  }
];
