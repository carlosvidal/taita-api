import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear app Express
const app = express();
const PORT = 3001;

// Configurar directorio de uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'test');
console.log('Directorio de uploads:', uploadDir);

// Crear directorio si no existe
if (!fs.existsSync(uploadDir)) {
  console.log('Creando directorio:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Multer: guardando en:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'test-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Multer: nombre de archivo:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware para depuración
app.use((req, res, next) => {
  console.log('Solicitud recibida:', req.method, req.url);
  console.log('Headers:', req.headers);
  next();
});

// Ruta para prueba de carga de archivos
app.post('/upload', upload.single('testfile'), (req, res) => {
  console.log('Solicitud de carga recibida');
  
  if (!req.file) {
    console.log('No se recibió ningún archivo');
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }
  
  console.log('Archivo recibido:', req.file);
  res.json({ 
    message: 'Archivo subido con éxito',
    file: req.file 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de prueba ejecutándose en http://localhost:${PORT}`);
});
