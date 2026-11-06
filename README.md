# FACAI · Transporte y Logística

Sitio público: https://facai.cl/

## Editar contenido

La configuración de Pages CMS está en .pages.yml. Los editores autorizados pueden editar portada, títulos y descripciones SEO, introducciones de servicios, galerías y clientes. El panel requiere autenticación con GitHub y una instalación autorizada para este repositorio. Los textos son datos públicos, no un espacio para contraseñas ni información privada de clientes.

## Construcción y despliegue

Requisitos: Node 24, Python 3.13 y las dependencias de requirements.txt.

Ejecutar python -m pip install -r requirements.txt y npm run build.
El generador valida las entradas, escapa los textos, prepara las páginas y ejecuta controles antes de crear dist/. Solo el contenido permitido se publica. Un fallo de validación detiene el despliegue y mantiene la última versión publicada.

GitHub Actions genera y publica dist/ desde main. Las fuentes content/ y scripts/ no forman parte del artefacto del sitio. Las nuevas fotografías de galerías se redimensionan y se codifican sin metadatos.

## Recuperación

Para deshacer un cambio de contenido, revierte su commit desde GitHub y espera a que el flujo de publicación termine correctamente. No fuerces el historial de main. Antes de cambios de configuración DNS o SSL conserva los valores previos.

## Analítica y privacidad

Google Analytics carga después del consentimiento. Solo se envían eventos permitidos, sin datos del cotizador ni parámetros de URL. Los clics de contacto no equivalen a solicitudes enviadas ni ventas. El sitio no contiene claves privadas; el identificador G- es público por diseño.

## Límites operacionales

El TMS es una vista conceptual. El cálculo de rutas necesita un proveedor de producción autorizado; mapa y cotizador son independientes. La CSP del HTML restringe recursos, pero las cabeceras HTTP del dominio se gestionan en el alojamiento/proxy, no en vercel.json.
