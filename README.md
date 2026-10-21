# 🚀 TeRespondo — Coming Soon Landing Page (Early Access & Waitlist)

Esta carpeta contiene la Landing Page de alta conversión para **TeRespondo**, optimizada para captura de leads calificados de Facebook Marketplace y lista para deploy en **Railway** o ejecución local.

---

## 📁 Estructura del Proyecto

```
landing/
├── package.json          # Configuración de dependencias y scripts para Railway / Node.js
├── server.js             # Servidor Express.js ligero de producción
├── .gitignore            # Exclusión de node_modules
├── README.md             # Esta guía paso a paso
└── public/
    ├── index.html        # Landing Page optimizada (React 18 + Tailwind CSS)
    └── assets/
        ├── logo.png              # Logotipo oficial de TeRespondo
        ├── seller_lifestyle.jpg  # Fotografía editorial de vendedor en taller
        └── chat_hands.jpg        # Fotografía de gestión de chats en smartphone
```

---

## 🛠️ Cómo Probar en Local

### Opción 1: Directo sin instalar nada (Doble Clic)
Simplemente abre el archivo [`public/index.html`](public/index.html) (o el archivo [`ComingSoon.html`](../ComingSoon.html) en la raíz de TeRespondo) con tu navegador habitual (Chrome, Edge, Brave, etc.). Todo funcionará inmediatamente gracias a los CDNs de React y Tailwind integrados.

### Opción 2: Correr con Node.js / Express
1. Abre tu terminal en esta carpeta:
   ```bash
   cd "proyectos/TeRespondo/landing"
   ```
2. Instala Express:
   ```bash
   npm install
   ```
3. Inicia el servidor local:
   ```bash
   npm start
   ```
4. Abre en tu navegador: **http://localhost:3000**

---

## ☁️ Cómo Desplegar en Railway (Paso a Paso)

Railway detectará automáticamente `package.json` y desplegará la landing con SSL (HTTPS) gratuito en menos de 2 minutos.

### Pasos:
1. **Subir a GitHub**:
   - Asegúrate de incluir la carpeta `landing` en tu repositorio de GitHub.
2. **Crear Servicio en Railway**:
   - Ingresa a [railway.app](https://railway.app/) e inicia sesión.
   - Haz clic en **"New Project"** > **"Deploy from GitHub repo"**.
   - Selecciona tu repositorio.
3. **Configurar el Root Directory** (si el repositorio contiene todo el proyecto TeRespondo):
   - En la configuración de tu servicio en Railway, ve a **Settings** > **Root Directory**.
   - Coloca: `proyectos/TeRespondo/landing` (o la ruta donde subas esta carpeta).
4. **Generar Dominio Público**:
   - En **Networking** > **Generate Domain**.
   - Railway te generará una URL pública (ejemplo: `https://terespondo-production.up.railway.app`). ¡Listo!

---

## 🔗 Conexión del Formulario con Webhook (Make / Integromat / Zapier)

En [`public/index.html`](public/index.html#L145), dentro de la función `handleSubmit`:
```javascript
/*
 * TODO: Insertar URL del Webhook aquí (Make / Integromat / Zapier / n8n)
 */
const WEBHOOK_URL = "https://hook.eu1.make.com/tu-token-aqui";
```
El formulario envía el siguiente JSON:
```json
{
  "fullName": "Martín Vega",
  "phone": "987654321",
  "email": "martin@empresa.com",
  "serviceType": "Financiamiento Inmobiliario",
  "submittedAt": "2026-10-20T21:10:00.000Z",
  "source": "Landing Coming Soon - TeRespondo"
}
```
Si dejas `WEBHOOK_URL` vacío, el formulario simula el envío con animación de éxito para demostraciones locales.
