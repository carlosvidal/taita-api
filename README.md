# Astro Blog API

This is the backend API for the Astro Blog application.

## Features
- User authentication
- Blog post management
- Comment system
- [Add other features]

## Requisitos
- Node.js 18+
- PostgreSQL 12+
- npm 9+

## Instalación
```
git clone https://github.com/tu-usuario/astro-blog-2.git
cd astro-blog-2/api
npm install
cp .env.example .env
```

## Configuración
Editar .env con tus credenciales:
```
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/astro_blog
JWT_SECRET=tu_clave_secreta
```

## Uso
```
# Desarrollo
npm run dev
# Producción
npm start
```

## Trae AI
Entiendo, voy a generar los documentos nuevamente de forma más limpia y separada. Aquí están los dos archivos correctamente formateados:

1. README.md:
```markdown
# Astro Blog API

API backend para el sistema de blog astronómico.

## Características principales
- Autenticación de usuarios
- Gestión de artículos del blog
- Sistema de comentarios
- Búsqueda y filtrado
- Gestión de categorías

## Requisitos
- Node.js 18+
- PostgreSQL 12+
- npm 9+

## Instalación
```
git clone https://github.com/tu-usuario/astro-blog-2.git
cd astro-blog-2
npm install
cp .env.example .env
 ```

## Configuración
Edita el archivo .env con tus credenciales:

```plaintext
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/astro_blog
JWT_SECRET=tu_secreto_jwt
 ```

## Uso
Iniciar servidor de desarrollo:

```
npm run dev
 ```

Iniciar servidor en producción:

```
npm start
 ```

## Documentación API
La documentación completa está disponible en formato OpenAPI:

- Especificación: /openapi.yaml
- Interfaz Swagger UI: /api-docs
## Licencia
MIT

```plaintext

2. openapi.yaml:

```yaml:%2FUsers%2Fcarlosvidal%2Fwww%2Fastro-blog-2%2Fopenapi.yaml
openapi: 3.0.3
info:
  title: Astro Blog API
  description: API para gestión de contenido astronómico
  version: 1.0.0
  contact:
    name: Soporte
    email: soporte@astroblog.com

servers:
  - url: http://localhost:3000/api
    description: Servidor de desarrollo

paths:
  /auth/register:
    post:
      summary: Registro de nuevo usuario
      tags: [Autenticación]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserRegister'
      responses:
        '201':
          description: Usuario registrado
        '400':
          description: Datos inválidos

  /posts:
    get:
      summary: Obtener todos los artículos
      tags: [Artículos]
      responses:
        '200':
          description: Lista de artículos
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Post'

components:
  schemas:
    UserRegister:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          format: password
          minLength: 8

    Post:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        content:
          type: string
        publishedAt:
          type: string
          format: date-time

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
 ```

¿Necesitas que agregue más endpoints o modifique alguna parte específica de los documentos?

## carlosvidal
Copy

Delete

no. tienes el mismo problema. arregla estos README.md openapi.yaml

## Trae AI
3 context(s) used

Entiendo que necesitas los archivos limpios y bien formateados. Aquí están las versiones corregidas:

1. README.md completo:
## Configuración
Editar .env con tus credenciales:

```plaintext
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/astro_blog
JWT_SECRET=tu_clave_secreta
 ```

## Uso
```
# Desarrollo
npm run dev

# Producción
npm start
 ```

## Documentación
- Especificación OpenAPI: /openapi.yaml
- Interfaz Swagger: /api-docs
## Licencia
MIT