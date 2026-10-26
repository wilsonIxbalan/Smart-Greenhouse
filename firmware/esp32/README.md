# Gateway ESP32

Puente entre el Arduino Mega y Supabase. **No decide nada**: reenvía la telemetría, entrega los comandos al
Mega y devuelve sus ACK (contrato v1, `packages/contracts`). Es el mismo canal que usa el simulador.

```
Mega TX1 (D18) ──divisor 1k/2k──► GPIO16 (RX2)      GND común
Mega RX1 (D19) ◄────────────────── GPIO17 (TX2)      9600 baud
```

| Qué hace | Cuándo |
| --- | --- |
| Envía la última trama del Mega a `device_ingest` | cada 10 s, y enseguida después de un ACK ok |
| Pide comandos a `device_pull_commands` y los escribe al Mega (`#507 BOMBA ON 600`) | cada 2,5 s |
| Reenvía cada ACK del Mega (`{"ack":507,"ok":1,"cmd":"BOMBA ON 600"}`) a `device_ack` | al recibirlo; si no hay red, reintenta |
| RFID: reenvía cada intento del lector (`{"rfid":"53D8…","ok":1}`) a `device_rfid_event` | al recibirlo; si no hay red, reintenta (hasta 8 en cola) |
| RFID: compara la lista de tarjetas (`device_pull_cards`) con la versión del Mega y, si cambió, se la escribe (`@CARDS` / `@CARD` / `@END`) | cada 30 s |

No guarda tramas sin conexión: la hora oficial es la de llegada al servidor y el `seq` ya cuenta las perdidas.
Si el Mega deja de enviar tramas (más de 10 s), tampoco pide comandos: así la web los marca "Expiró". Ante un
fallo de red o del servidor espera 5 s, 10 s… hasta 30 s antes de reintentar. Los comandos se escriben al Mega
de a uno (400 ms entre ellos) porque su buffer serie es de 64 B.

> **No correr el simulador y el ESP32 a la vez con `inv-01`:** la nube los vería como un solo dispositivo
> (reinicios falsos, tramas duplicadas y comandos confirmados por el simulador que la maqueta nunca ejecutó).
> Al conectar el hardware, detener el simulador.

Si se pierde la placa, la llave del dispositivo se puede leer de su memoria: generar otra con el script 12
(la anterior deja de servir) y actualizar `secrets.h`. En el Arduino IDE dejar *Core Debug Level: None*.

## Cargarlo

1. Arduino IDE → *Boards Manager*: **esp32** (Espressif, 3.x) → placa *ESP32 Dev Module*.
2. *Library Manager*: **ArduinoJson** (Benoit Blanchon, 7.x).
3. Copiar `gateway/secrets.h.example` como `gateway/secrets.h` y completar Wi-Fi (2,4 GHz), URL, anon key y la
   llave del dispositivo (script 12). `secrets.h` está en `.gitignore`.
4. Abrir `gateway/gateway.ino`, subir y abrir el Monitor Serie a **115200**.

## Qué se ve en el Monitor Serie

| Mensaje | Significa |
| --- | --- |
| `[nube] trama OK {"ok":true,...}` | La lectura llegó; la web la muestra |
| `[mega] JSON sin "v":1 ni "ack"` | El Mega todavía envía el formato viejo (faltan `v`, `seq`, `up`…) |
| `[nube] trama RECHAZADA 400: ... 22023` | La trama no cumple el contrato (campo faltante o fuera de rango) |
| `[nube] trama RECHAZADA 403: ... 28000` | `DEVICE_ID` o `DEVICE_KEY` incorrectos |
| `[nube] sin respuesta (-1)` | Sin internet o HTTPS falló (revisar `[hora] sincronizada`) |
| `[cmd] -> Mega: #507 BOMBA ON 600` y luego `[ack] OK` | Comando entregado y confirmado |

HTTPS se verifica con los certificados raíz de `gateway/ca_roots.h` (Let's Encrypt, Google Trust Services y
SSL.com, que son los que usa Supabase detrás de Cloudflare). Si algún día falla el TLS con la hora bien
sincronizada, revisar en el navegador quién emite el certificado de `<proyecto>.supabase.co` y agregar esa raíz.
