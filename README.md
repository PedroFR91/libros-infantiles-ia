# Libros Infantiles IA - by IconicoSpace

Plataforma para crear libros infantiles personalizados con IA. El niño es el protagonista de su propia aventura.

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI GPT-4o-mini (texto) + DALL-E 3 (imágenes)
- **Pagos**: Stripe Checkout + Webhooks
- **PDF**: pdf-lib (generación server-side)

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+
- Cuenta de OpenAI con API key
- Cuenta de Stripe con productos configurados

## 🛠️ Instalación Local

```bash
# Clonar repositorio
git clone <repo-url>
cd libros-infantiles-ia

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar .env con tus credenciales

# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev

# Iniciar desarrollo
npm run dev
```

## 🔧 Variables de Entorno

```env
# Base
BASE_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/libros_infantiles_ia"

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📡 API Endpoints

### Libros

- `GET /api/books` - Listar libros del usuario
- `POST /api/books` - Crear libro draft
- `GET /api/books/:id` - Obtener libro con páginas
- `PATCH /api/books/:id` - Actualizar libro
- `DELETE /api/books/:id` - Eliminar libro
- `POST /api/books/:id/generate` - Generar libro completo (IA)
- `POST /api/books/:id/pages/:pageNumber/regenerate` - Regenerar página

### PDF

- `POST /api/books/:id/pdf?type=digital|print` - Generar PDF
- `GET /api/books/:id/pdf/download?type=digital|print` - Descargar PDF

### Stripe

- `GET /api/stripe/checkout` - Obtener packs de créditos
- `POST /api/stripe/checkout` - Crear sesión de checkout
- `POST /api/stripe/webhook` - Webhook de Stripe

### Usuario

- `GET /api/user` - Obtener usuario y créditos

## 💰 Sistema de Créditos

| Acción                 | Coste      |
| ---------------------- | ---------- |
| Generar libro completo | 5 créditos |
| Regenerar página       | 1 crédito  |

### Packs disponibles

- 5 créditos - €4.99
- 15 créditos - €12.99 (Popular)
- 30 créditos - €22.99

## 🚀 Deploy en EC2

### 1. Preparar EC2

```bash
# Ubuntu 22.04 LTS
# Tipo: t3.small o mayor

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2

# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Configurar PostgreSQL

```bash
sudo -u postgres psql

CREATE USER libros_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE libros_infantiles_ia OWNER libros_user;
GRANT ALL PRIVILEGES ON DATABASE libros_infantiles_ia TO libros_user;
\q
```

### 3. Clonar y Configurar App

```bash
cd /var/www
sudo git clone <repo-url> libros-ia
cd libros-ia

# Configurar permisos
sudo chown -R $USER:$USER /var/www/libros-ia

# Instalar dependencias
npm install

# Crear .env
cp .env.example .env
nano .env
# Configurar todas las variables

# Build
npm run build

# Migraciones
npx prisma migrate deploy

# Crear directorio de storage
mkdir -p storage/pdfs
```

### 4. Configurar PM2

```bash
# Iniciar
pm2 start npm --name "libros-ia" -- start
pm2 save
pm2 startup
```

### 5. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/libros-ia
```

```nginx
server {
    listen 80;
    server_name libros.iconicospace.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    client_max_body_size 50M;
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/libros-ia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configurar SSL con Let's Encrypt

```bash
sudo certbot --nginx -d libros.iconicospace.com
```

### 7. Configurar DNS

En tu proveedor de dominio, crear registro A:

```
libros.iconicospace.com -> IP_DE_TU_EC2
```

### 8. Configurar Stripe Webhook

En Stripe Dashboard:

1. Ir a Developers > Webhooks
2. Añadir endpoint: `https://libros.iconicospace.com/api/stripe/webhook`
3. Seleccionar eventos: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copiar el signing secret a `STRIPE_WEBHOOK_SECRET`

## 📝 TODOs para futuras mejoras

- [ ] Implementar S3 para almacenamiento de PDFs e imágenes
- [ ] Añadir bleed completo en PDF print-ready
- [ ] Editor de texto rico (negrita, cursiva)
- [ ] Múltiples estilos de ilustración
- [ ] Compartir libros públicamente
- [ ] Sistema de usuarios con autenticación
- [ ] Panel de administración
- [ ] Analytics de uso

## 📄 Licencia

© 2026 IconicoSpace. Todos los derechos reservados.
