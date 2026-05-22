# OmniCapture Manager

Sistema de gestion empresarial para **OmniCapture** - empresa especializada en fotogrametria y creacion de activos 3D.

## Requisitos

- Node.js >= 20
- Linux (Garuda/Arch, Ubuntu, etc.)
- Entorno grafico X11/Wayland

## Instalacion

### Opcion A: Con npm (recomendado si el disco no soporta symlinks)

```bash
npm install --no-bin-links
npm start
```

### Opcion B: Con pnpm (en disco con soporte de symlinks)

```bash
pnpm install
pnpm start
```

## Modulos

### 1. Panel de Control
Vista general con KPIs: clientes activos, facturas emitidas, total facturado, beneficio neto, activos 3D y equipos fisicos.

### 2. Gestion de Clientes
- CRUD completo de clientes (nombre, NIF/CIF, email, telefono, direccion)
- Historial de pedidos: escaneo exterior/interior, materiales PBR, mallas 3D, etc.
- Adjuntar documentos (contratos, albaranes PDF)
- Busqueda y filtros

### 3. Gestion de Facturas
- Generacion de facturas con numero automatico (FACT-YYYY-XXXX)
- Lineas de factura con concepto, cantidad, precio unitario
- IVA configurable (21% por defecto)
- Previsualizacion en HTML y exportacion a PDF (via dialogo de impresion)
- Estados: emitida, pagada, vencida
- Edicion solo si no esta pagada

### 4. Contabilidad
- Balance ingresos vs gastos
- Libro diario cronologico
- KPIs: total facturado, cobrado, gastos, beneficio neto
- Registro manual de gastos con categorias
- Exportacion a CSV

### 5. Inventario
- **Inventario Fisico**: camaras, PCs, NAS, servidores, sensores, etc.
  - Estado: operativo, reparacion, retirado
  - Sistema de prestamos con historial
- **Inventario Digital**: mallas 3D, texturas PBR, mapas, proyectos Meshroom
  - Ruta en servidor/NAS, tamaño, cliente asociado

## Tecnologias

- Electron 37
- electron-store (persistencia JSON en userData)
- HTML/CSS/JS puro (sin frameworks)
- Modo oscuro/claro
- `window.print()` para generacion de PDFs

## Estructura del Proyecto

```
gestor-empresarial/
├── package.json
├── main.js              # Proceso principal Electron
├── preload.js           # Puente IPC seguro
├── index.html           # Interfaz principal
├── renderer.js          # Logica de UI
├── styles.css           # Estilos (dark/light mode)
├── modules/
│   ├── clientes.js      # Modulo clientes
│   ├── facturas.js      # Modulo facturas
│   ├── contabilidad.js  # Modulo contabilidad
│   └── inventario.js    # Modulo inventario
└── utils/
    ├── helpers.js       # Funciones auxiliares
    ├── storage.js       # Capa de persistencia
    └── pdfGenerator.js  # Generacion de PDFs
```

## Datos

Los datos se almacenan localmente usando `electron-store` en el directorio `userData` de Electron:
- Linux: `~/.config/omnicapture-manager/`

Formato JSON con las siguientes colecciones:
- `clientes`
- `facturas`
- `gastos`
- `inventarioFisico`
- `inventarioDigital`
- `config`
