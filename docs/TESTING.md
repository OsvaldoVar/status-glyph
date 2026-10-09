# Verificación

## Ejecutado en el entorno de desarrollo

- 7 pruebas unitarias: rangos, CPU y guest counters, MemAvailable, discretización, colores, límites geométricos y ciclo de vida del proveedor.
- Sintaxis de módulos JavaScript y resolución de imports locales.
- Lectura de metadata y estructura XML de 20 claves GSettings.
- Validación sintáctica del instalador.

No se ha ejecutado GJS ni GNOME Shell. El compilador GLib no está disponible en el entorno inicial: CI está configurado para compilar el esquema con `--strict` antes de empaquetar. La configuración de CI existe; su ejecución remota aún no está verificada.

## Pendiente en GNOME real

1. Probar las versiones objetivo individualmente. Reducir metadata a las versiones comprobadas antes de publicar.
2. Confirmar que el widget queda encima del fondo y debajo de ventanas, también tras cambio de wallpaper.
3. Abrir/cerrar overview, bloquear/desbloquear y probar pantalla completa.
4. Cambiar las ocho combinaciones de barras/puntos en 48, 72, 112, 160 y 256 px.
5. Revisar modos claro/oscuro, tema personalizado, escala fraccional y colores sobre distintos fondos.
6. Cambiar métricas repetidamente; confirmar que tres canales CPU comparten un proveedor.
7. Apagar/encender Wi-Fi y Bluetooth; conectar/desconectar dispositivos y cargador.
8. Probar sin batería, adaptador Bluetooth, NetworkManager o sensor térmico reconocido.
9. Suspender/reanudar; conectar/desconectar monitor; cambiar principal y área de trabajo.
10. Ejecutar 100 ciclos de enable/disable y revisar logs, memoria y fuentes activas.
11. Medir CPU en reposo y durante polling; comprobar ausencia de fuentes tras disable.
12. Abrir preferencias, cambiar opciones externamente y cerrar/reabrir; verificar persistencia.

Logs:

```bash
journalctl --user -b -f -o cat | rg 'status-glyph|Gjs|JS ERROR'
```

No publicar en extensions.gnome.org hasta completar estos controles.
