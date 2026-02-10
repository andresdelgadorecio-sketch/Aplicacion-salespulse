# Documentación Técnica - Sales Pulse (Forecast Commander 2026)

Este documento contiene la información técnica detallada del producto "Sales Pulse" para alimentar la base de conocimiento de un agente de IA (ElevenLabs/n8n). El objetivo es responder preguntas de clientes/usuarios finales y técnicos.

---

## 1. Descripción del Producto
**Sales Pulse** (Forecast Commander 2026) es una plataforma avanzada de análisis y gestión de previsiones de ventas (Forecasting) diseñada para equipos comerciales de alto rendimiento. Permite visualizar KPIs, gestionar oportunidades de negocio, analizar riesgos y cargar datos masivos para proyecciones financieras.

*   **Versión Actual**: 1.0.0 (MVP)
*   **Año Fiscal**: 2026

---

## 2. Stack Tecnológico (Infraestructura)
La aplicación está construida con tecnologías modernas de desarrollo web, priorizando rendimiento, seguridad y experiencia de usuario.

*   **Frontend Framework**: [Next.js](https://nextjs.org/) (React) usando **App Router**.
*   **Lenguaje**: TypeScript (Tipado estático estricto).
*   **Estilos**: [Tailwind CSS](https://tailwindcss.com/) (Diseño responsivo y sistema de diseño dark-mode).
*   **Componentes UI**: Tailwind UI, Shadcn/UI (primitivos accesibles), Lucide React (iconos).
*   **Visualización de Datos**: [Tremor](https://www.tremor.so/) (Gráficos interactivos de alto rendimiento).
*   **Backend / Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL as a Service).
*   **Autenticación**: Supabase Auth (Email/Password + Row Level Security).
*   **Despliegue**: Self-Hosted en servidor Coolify (IP: `148.230.91.43`).

---

## 3. Arquitectura de Seguridad y Roles
El sistema utiliza un modelo de control de acceso basado en roles (RBAC) estricto. La seguridad se aplica tanto en el Frontend (UI) como en el Backend (Base de Datos).

### 3.1 Roles de Usuario
Existen 3 roles principales con permisos diferenciados:

1.  **Administrador (`admin`)**:
    *   **Acceso Total**: Ve todos los módulos.
    *   **Gestión de Usuarios**: Puede crear, editar roles y eliminar usuarios.
    *   **Privilegios**: Acceso al panel `/admin/users`.
    *   *Ejemplo de uso*: Gerente General o IT Manager.

2.  **Supervisor (`supervisor`)**:
    *   **Enfoque**: Análisis estratégico.
    *   **Acceso Permitido**: Dashboard, Oportunidades, Riesgos, **Analizador**.
    *   **Restricciones**: NO puede cargar datos masivos (`/upload`) ni gestionar usuarios.
    *   *Ejemplo de uso*: Directores de Ventas regionales.

3.  **Comercial (`commercial`)**:
    *   **Enfoque**: Operativo y carga de datos.
    *   **Acceso Permitido**: Dashboard, Oportunidades, Riesgos, **Cargar Datos** (`/upload`).
    *   **Restricciones**: NO tiene acceso al "Analizador" (herramienta avanzada) ni gestión de usuarios.
    *   *Ejemplo de uso*: Vendedores, KAMs.

### 3.2 Seguridad de Datos (RLS)
*   La base de datos PostgreSQL utiliza **Row Level Security (RLS)**.
*   Incluso si un usuario intenta acceder a la API directamente, solo puede ver/modificar los datos permitidos por su rol.
*   Existe una restricción de base de datos (`Check Constraint`) que asegura que solo se asignen roles válidos: `admin`, `commercial`, `supervisor`, `analyst`.

---

## 4. Módulos Principales

### 4.1 Dashboard Principal (`/summary`)
*   Vista ejecutiva con KPIs en tiempo real: Ventas del Período, Forecast Ponderado, Gap vs AOP (Annual Operating Plan), Pipeline en Riesgo.
*   Gráficos de tendencia de ventas vs meta AOP.
*   Distribución de ventas por país.

### 4.2 Oportunidades (`/opportunities`)
*   Listado detallado de todas las oportunidades comerciales en curso.
*   Filtrado y búsqueda inteligente.
*   Permite a los comerciales actualizar el estado de sus negociaciones.

### 4.3 Analizador (`/analyzer`) - *Exclusivo Admin/Supervisor*
*   Herramienta de Business Intelligence.
*   Permite desglose profundo (Drill-down) de la data.
*   Análisis de conversión y eficiencia del funnel de ventas.

### 4.4 Riesgos (`/risks`)
*   Módulo de IA/Algorítmico que detecta oportunidades estancadas o con baja probabilidad de cierre.
*   Alertas automáticas sobre fechas de cierre vencidas.

### 4.5 Carga de Datos (`/upload`) - *Exclusivo Admin/Comercial*
*   Interfaz para la importación masiva de datos vía Excel (`.xlsx`, `.csv`).
*   Validación de estructura de archivos antes de la ingesta a base de datos.

### 4.6 Gestión de Usuarios (`/admin/users`) - *Exclusivo Admin*
*   Alta de nuevos usuarios con asignación de rol inicial.
*   Modificación de roles existentes.
*   **Eliminación segura de usuarios** (Implementado con doble confirmación).

---

## 5. Integraciones e Inteligencia Artificial

### 5.1 Agente de Ventas AI (n8n + Supabase)
*   Integración con flujos de trabajo en **n8n**.
*   Capacidad de consulta en lenguaje natural sobre la base de datos de ventas (ej: "¿Cuáles son las oportunidades mayores a 50k en Perú?").
*   Widget de chat integrado en el dashboard (`ai-chat-widget.tsx`) que conecta con el backend de IA.

### 5.2 Base de Datos Vectorial (Próximamente)
*   Preparado para búsquedas semánticas (RAG) sobre documentos comerciales y notas de reuniones.

---

## 6. Preguntas Frecuentes Técnicas (FAQ)

**Q: ¿Cómo se maneja la persistencia de sesión?**
A: Utilizamos cookies seguras y tokens JWT de Supabase. La sesión persiste hasta que expira o el usuario hace logout. *Importante:* Si se comparten equipos, se recomienda usar modo incógnito para evitar mezcla de sesiones.

**Q: ¿Es posible recuperar un usuario borrado?**
A: No. La eliminación desde el panel de administración es definitiva (Hard Delete) por cumplimiento de normas de privacidad (GDPR/Compliance).

**Q: ¿Qué pasa si un Comercial intenta entrar a la URL del Analizador?**
A: El Middleware de Next.js detecta su rol y lo redirige automáticamente a la página de "Acceso Denegado" o al Dashboard principal.

**Q: ¿La aplicación funciona sin internet?**
A: No, Sales Pulse es una aplicación Cloud-Native que requiere conexión activa para sincronizar datos con Supabase en tiempo real.

---

## 7. Contacto de Soporte
Para problemas técnicos, incidencias de acceso o bugs, contactar al equipo de Ingeniería o al Administrador del sistema (`andres.diaz@gmail.com`).

---
*Documento generado automáticamente por Equipo de Ingeniería Sales Pulse.*
