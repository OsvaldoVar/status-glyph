# Arquitectura

`extension.js` administra el ciclo de vida y coloca el actor dentro del grupo de ventanas, por encima del grupo de fondos. La visibilidad del escritorio/overview depende del grupo nativo de ventanas. El orden de capas requiere validación por versión de Shell.

`widget/StatusGlyph.js` conecta GSettings y los proveedores. `Geometry.js` centraliza coordenadas normalizadas. `Renderers.js` dibuja directamente con Cairo; no usa imágenes rasterizadas ni procesos externos.

`Registry` comparte proveedores con conteo de referencias. Solo existen proveedores elegidos por los tres canales. Cada proveedor emite objetos `{value, label, available, state}`. Los cambios idénticos no provocan repintado.

`DBusProvider` vigila disponibilidad del servicio y escucha PropertiesChanged/ObjectManager. Las consultas son asíncronas, tienen timeout y se cancelan al desactivar. Un indicador de cambio pendiente agrupa eventos mientras hay una consulta en curso. Los resultados de una conexión antigua se descartan.

`SystemProvider` lee procfs/sysfs asíncronamente. `Scheduler` usa una única fuente de GLib con intervalo de un segundo; la elimina al perder el último trabajo. Ninguna métrica ejecuta comandos externos.

Al desactivar: desconectar eventos de monitores, área de trabajo y GSettings; destruir widget; liberar proveedores; cancelar operaciones D-Bus/archivos; retirar temporizador. La bandera `running` impide publicar resultados tardíos.

La ventana de preferencias corre fuera de GNOME Shell y es la única que importa GTK/Adwaita. Los módulos del widget no importan GTK.

El tema aporta foreground; los colores personalizados se validan como `#RRGGBB`. El estado no disponible reduce la opacidad del canal. Los estados de advertencia/carga se conservan en el modelo, sin añadir colores de alarma por defecto.
