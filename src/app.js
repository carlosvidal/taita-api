import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import categoriesRouter from './routes/categories.js' 
import postsRouter from './routes/posts.js'
import pagesRouter from './routes/pages.js'
import menuRouter from './routes/menu.js'
import statsRouter from './routes/stats.js'
import authRouter from './routes/auth.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Configuración CORS actualizada para permitir peticiones desde ambos puertos
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Permitir ambos puertos
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json())

// Rutas de la API
app.use('/api/posts', postsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/pages', pagesRouter)
app.use('/api/menu', menuRouter)
app.use('/api', statsRouter);
app.use('/api', authRouter); // Añadir rutas de autenticación

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
