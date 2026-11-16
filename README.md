# Red Rabbit TCG — Backend

API en Express + MongoDB para la tienda Red Rabbit TCG Cuernavaca. Mismo esquema que Vizadi:
`routes/` → `controllers/` → `models/`, con la lógica externa en `services/`.

## Estructura

```
server.js              Arranque, conexión a Mongo y registro de rutas
routes/                Endpoints por sección (auth, inventario, pedidos, eventos, wishlist)
controllers/           Lógica de cada endpoint
models/                Usuario, Carta, Pedido, Evento, Wishlist
middleware/            verificarToken y verificarRol
services/              scryfallService, correoService, csvService, alertasService
utils/                 Fechas y formato de dinero
scripts/crearAdmin.js  Crea cuentas de staff/admin
```

## Puesta en marcha

```bash
cp .env.example .env     # llena MONGO_URI, JWT_SECRET y SMTP
npm install
npm run dev
node scripts/crearAdmin.js tu@correo.com "Tu nombre" contraseña admin
```

Sin SMTP configurado, los correos se imprimen en consola.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/registrar`, `/api/auth/login` | Público |
| GET/PUT | `/api/auth/perfil` | Sesión |
| GET | `/api/inventario/catalogo?juego=&q=&rareza=&condicion=&orden=&pagina=` | Público |
| GET | `/api/inventario/recientes`, `/api/inventario/:id` | Público |
| GET/POST/PUT/DELETE | `/api/inventario` | Staff |
| GET | `/api/inventario/csv/plantilla` | Staff |
| POST | `/api/inventario/csv/previsualizar`, `/api/inventario/csv/importar` (campo `archivo`) | Staff |
| POST | `/api/inventario/imagenes/sincronizar` | Staff |
| POST | `/api/pedidos` | Público (con o sin sesión) |
| GET | `/api/pedidos/mios` | Sesión |
| GET / PATCH | `/api/pedidos`, `/api/pedidos/:id/estado` | Staff |
| POST | `/api/pedidos/pos` | Staff (venta de mostrador) |
| GET | `/api/eventos`, `/api/eventos/:id` | Público |
| POST/DELETE | `/api/eventos/:id/reservar` | Sesión |
| POST/PUT/DELETE | `/api/eventos` | Staff |
| GET/POST/DELETE | `/api/wishlist` | Sesión |

## Inventario por CSV

Columnas: `nombre, juego, expansion, numero, rareza, condicion, idioma, foil, precio, stock`.
`juego`: magic, pokemon, onepiece, yugioh, lorcana, otro. `condicion`: NM, LP, MP, HP, DMG.
Primero `previsualizar` (no guarda nada) y luego `importar` con `modo=sumar` o `modo=reemplazar`.

## Scryfall (arte de Magic)

Al importar, las cartas de Magic quedan con `imagenEstado: pendiente` y `scryfallService` busca su
imagen en lotes de 75 (`/cards/collection`), respetando los límites de Scryfall. La URL, el
`scryfallId` y el artista se guardan en la carta, así que el catálogo nunca consulta Scryfall.
Con `expansion` + `numero` la búsqueda es exacta; solo con nombre se toma la impresión por defecto.
Muestra el crédito a Scryfall y el nombre del artista donde aparezca la imagen.

## Pedidos por correo

Al crear un pedido se descuenta el stock al momento (apartado por `DIAS_APARTADO` días) y se
manda correo al cliente y a `CORREO_TIENDA`. Al cancelar, el stock regresa. Estados:
pendiente → confirmado → listo → entregado (o cancelado).

## Despliegue

Igual que Vizadi: `Dockerfile` + GitHub Actions que publica `red-rabbit-tcg-backend:latest` en
Docker Hub (variables `DOCKERHUB_USERNAME` y secreto `DOCKERHUB_TOKEN`).
