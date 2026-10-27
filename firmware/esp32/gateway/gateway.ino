/* ============================================================
   INVERNADERO INTELIGENTE - GATEWAY ESP32 (contrato v1)
   Mega (Serial2) <-> Supabase (HTTPS, RPC device_*). Solo comunica:
   el Mega decide; el ESP32 reenvia tramas, comandos y ACK.
   Placa: ESP32 Dev Module (core 3.x). Libreria: ArduinoJson 7.
   RFID (1.2): reenvia los intentos del lector ({"rfid":...,"ok":...}) a
   device_rfid_event y mantiene la lista de tarjetas del Mega al dia con
   device_pull_cards (lineas @CARDS / @CARD / @END). Cambios marcados "RFID".
   ============================================================ */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "secrets.h"   // copiar de secrets.h.example
#include "ca_roots.h"

// ---------- PINES (ARCHITECTURE: GND comun; Serial1 del Mega por TXS0108E 5 V <-> 3,3 V) ----------
#define PIN_RX_MEGA 16   // RX2 <- TX1 (D18) del Mega
#define PIN_TX_MEGA 17   // TX2 -> RX1 (D19) del Mega
#define MEGA_BAUD   9600

// ---------- TIEMPOS ----------
const unsigned long INGEST_MS      = 10000;  // una trama a la nube cada 10 s (Q-31)
const unsigned long POLL_MS        = 2500;   // sondeo de comandos
const unsigned long FRAME_FRESH_MS = 10000;  // Mega callado mas de esto = no se reenvia ni se piden comandos
const unsigned long CMD_GAP_MS     = 400;    // entre comandos al Mega (su buffer RX es de 64 B)
const unsigned long NTP_RETRY_MS   = 60000;
const unsigned long BACKOFF_MIN_MS = 5000, BACKOFF_MAX_MS = 30000;
const size_t MAX_FRAME_BYTES = 512;          // MAX_FRAME_BYTES del contrato
const size_t MAX_LINE = 700;
const char *FW_VERSION = "esp32-gw-1.2-rfid";
const unsigned long CARDS_MS       = 30000;  // RFID: cada cuanto se revisa la lista de tarjetas
const unsigned long CARDS_ASK_MS   = 600000; // RFID: cada 10 min se vuelve a preguntar al Mega su version

// ---------- ESTADO ----------
String line;                  // linea en curso desde el Mega
bool lineOverflow = false;
String lastFrame;             // ultima trama v1 (JSON compacto)
unsigned long lastFrameAt = 0;
bool haveFrame = false;
bool frameSent = true;        // la ultima trama ya se envio (o se descarto)
bool sendNextFrame = false;   // tras un ACK ok: la siguiente trama sale enseguida
unsigned long lastIngest = 0, lastPoll = 0, lastNtpTry = 0, lastCmdAt = 0;
unsigned long cloudPausedUntil = 0, backoffMs = 0;
bool ntpStarted = false;

const int QUEUE = 8;
String ackQueue[QUEUE];       // ACK que la nube aun no recibio (se reintentan)
long ackIds[QUEUE];
int ackCount = 0;
String cmdQueue[QUEUE];       // comandos traidos de la nube, se escriben al Mega de a uno
int cmdCount = 0;

// ---------- RFID ----------
String rfidQueue[QUEUE];      // intentos del lector que la nube aun no recibio
int rfidCount = 0;
const int SYNC_MAX = 24;      // @CARDS + 20 tarjetas + @END (con margen)
String syncLines[SYNC_MAX];   // lista de tarjetas que se esta escribiendo al Mega
int syncCount = 0, syncIdx = 0;
long megaCardsVer = -1;       // version de la lista que tiene el Mega (-1 = aun no se sabe)
bool megaCardsAsked = false;
unsigned long lastCards = 0, lastCardsAsk = 0;

WiFiClientSecure tls;
HTTPClient http;

// ---------- ARRANQUE ----------
void setup() {
  Serial.begin(115200);                       // USB: registro para depurar
  Serial2.setRxBufferSize(2048);              // una peticion HTTPS bloquea ~1 s; no perder tramas
  Serial2.begin(MEGA_BAUD, SERIAL_8N1, PIN_RX_MEGA, PIN_TX_MEGA);
  line.reserve(MAX_LINE);
  delay(200);
  Serial.println("\n[gw] Invernadero gateway " + String(FW_VERSION));

  const char *problema = revisarConfig();
  if (problema) {
    Serial.println(String("[gw] ERROR en secrets.h: ") + problema);
    while (true) delay(1000);
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);                // el core reconecta solo
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("[wifi] conectando a la red...");

  tls.setCACert(CA_ROOTS);                    // HTTPS verificado (nunca setInsecure)
  tls.setHandshakeTimeout(10);                // s
  http.setReuse(true);                        // mantiene la conexion TLS entre peticiones
  http.setTimeout(5000);
  http.setConnectTimeout(5000);
}

const char *revisarConfig() {
  const char *valores[] = {WIFI_SSID, WIFI_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY, DEVICE_ID, DEVICE_KEY};
  for (const char *v : valores) if (strlen(v) == 0 || strchr(v, '<')) return "todavia tiene valores de ejemplo";
  if (strncmp(SUPABASE_URL, "https://", 8) != 0) return "SUPABASE_URL debe empezar con https://";
  if (SUPABASE_URL[strlen(SUPABASE_URL) - 1] == '/') return "SUPABASE_URL no debe terminar en /";
  return nullptr;
}

// ---------- BUCLE ----------
void loop() {
  leerMega();
  escribirComando();

  if (WiFi.status() != WL_CONNECTED) return;
  horaNtp();
  if ((long)(millis() - cloudPausedUntil) < 0) return;   // backoff tras un fallo de red o del servidor

  if (!enviarAcks()) return;
  bool megaVivo = haveFrame && millis() - lastFrameAt < FRAME_FRESH_MS;
  if (megaVivo && !frameSent && (sendNextFrame || millis() - lastIngest >= INGEST_MS)) {
    if (!enviarTrama()) return;
  }
  if (megaVivo && cmdCount == 0 && millis() - lastPoll >= POLL_MS) { lastPoll = millis(); traerComandos(); }
  // RFID: intentos del lector y lista de tarjetas
  if (!enviarEventosRfid()) return;
  if (megaVivo && syncIdx >= syncCount && (lastCards == 0 || millis() - lastCards >= CARDS_MS)) {
    sincronizarTarjetas();
  }
}

// TLS necesita la hora real para validar fechas del certificado. Nunca bloquea el bucle.
void horaNtp() {
  if (time(nullptr) >= 1700000000) {
    if (ntpStarted && lastNtpTry) { Serial.println("[hora] sincronizada"); lastNtpTry = 0; }
    return;
  }
  if (ntpStarted && millis() - lastNtpTry < NTP_RETRY_MS) return;
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  ntpStarted = true;
  lastNtpTry = millis();
}

// Exito: sin pausa. Fallo de red o 5xx: pausa 5 s, 10 s... hasta 30 s (no martillar el bcrypt del servidor).
void registrarResultado(int status) {
  bool fallo = status < 0 || status >= 500 || status == 408 || status == 429;
  if (!fallo) { backoffMs = 0; return; }
  backoffMs = backoffMs ? min(backoffMs * 2, BACKOFF_MAX_MS) : BACKOFF_MIN_MS;
  cloudPausedUntil = millis() + backoffMs;
  Serial.println("[nube] pausa " + String(backoffMs / 1000) + " s (" + String(status) + ")");
}

// ---------- MEGA -> ESP32 ----------
void leerMega() {
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    if (c == '\n') {
      if (!lineOverflow && line.length()) procesarLinea(line);
      line = "";
      lineOverflow = false;
    } else if (c != '\r') {
      if (line.length() < MAX_LINE) line += c;
      else lineOverflow = true;               // linea demasiado larga: se descarta entera
    }
  }
}

// Indice justo despues del objeto JSON que empieza en 0, o -1. Detecta basura pegada al final.
int finDeObjeto(const String &s) {
  int depth = 0;
  bool enTexto = false, escape = false;
  for (int i = 0; i < (int)s.length(); i++) {
    char c = s[i];
    if (enTexto) {
      if (escape) escape = false;
      else if (c == '\\') escape = true;
      else if (c == '"') enTexto = false;
    } else if (c == '"') enTexto = true;
    else if (c == '{') depth++;
    else if (c == '}' && --depth == 0) return i + 1;
  }
  return -1;
}

void procesarLinea(String l) {
  l.trim();
  if (!l.startsWith("{")) { Serial.println("[mega] " + l); return; }  // texto de depuracion del Mega
  if (finDeObjeto(l) != (int)l.length()) { Serial.println("[mega] linea mezclada: descartada"); return; }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, l);
  if (err || !doc.is<JsonObject>()) { Serial.println("[mega] JSON invalido: " + l); return; }

  if (doc["ack"].is<long>()) {                // ACK: {"ack":507,"ok":1,"cmd":"BOMBA ON 600"} |{"ack":508,"ok":0,"err":"NO_WATER"}
    String ack;
    serializeJson(doc, ack);
    encolarAck(doc["ack"].as<long>(), ack);
    if (doc["ok"] == 1) { frameSent = true; sendNextFrame = true; }  // espera la trama con el estado nuevo
    return;
  }
  if (doc["rfid"].is<const char *>()) {       // RFID: intento en el lector {"rfid":"53D8...","ok":1}
    String ev;
    serializeJson(doc, ev);
    encolarRfid(ev);
    Serial.println("[rfid] " + ev);
    return;
  }
  if (doc["cards"].is<long>()) {              // RFID: el Mega confirma su lista {"cards":7,"ok":1,"n":4}
    if (doc["ok"] == 1) {
      megaCardsVer = doc["cards"].as<long>();
      Serial.println("[rfid] el Mega tiene la lista v" + String(megaCardsVer) + " (" + String(doc["n"].as<int>()) + " tarjetas)");
    } else {
      Serial.println("[rfid] el Mega rechazo la lista v" + String(doc["cards"].as<long>()) + "; se reintenta");
      lastCards = millis() - CARDS_MS + 5000;  // reintento en 5 s
    }
    return;
  }
  if (doc["v"] == 1) {                        // trama de telemetria v1
    String frame;
    serializeJson(doc, frame);
    if (frame.length() > MAX_FRAME_BYTES) {
      Serial.println("[mega] trama de " + String(frame.length()) + " B (max 512): descartada");
      return;
    }
    lastFrame = frame;
    lastFrameAt = millis();
    haveFrame = true;
    frameSent = false;
    return;
  }
  Serial.println("[mega] JSON sin \"v\":1 ni \"ack\": " + l);
}

// ---------- ESP32 -> MEGA ----------
void escribirComando() {
  if (millis() - lastCmdAt < CMD_GAP_MS) return;
  if (cmdCount == 0) {                        // RFID: sin comandos pendientes, sigue la lista de tarjetas
    if (syncIdx < syncCount) {
      Serial2.print(syncLines[syncIdx]);
      Serial2.print('\n');
      lastCmdAt = millis();
      if (++syncIdx == syncCount && syncCount > 1) Serial.println("[rfid] lista enviada al Mega; esperando su confirmacion");
    }
    return;
  }
  Serial2.print(cmdQueue[0]);
  Serial2.print('\n');
  Serial.println("[cmd] -> Mega: " + cmdQueue[0]);
  lastCmdAt = millis();
  for (int i = 1; i < cmdCount; i++) cmdQueue[i - 1] = cmdQueue[i];
  cmdCount--;
}

// "#<id> PALABRA [num] [num]": el id debe ser el de la fila; solo mayusculas, digitos y espacios simples.
bool wireValido(const char *w, long long id) {
  if (!w || w[0] != '#') return false;
  char esperado[24];
  snprintf(esperado, sizeof esperado, "#%lld ", id);
  size_t n = strlen(w), p = strlen(esperado);
  if (n > 48 || strncmp(w, esperado, p) != 0 || p >= n) return false;
  int palabras = 0;
  bool enPalabra = false;
  for (size_t i = p; i < n; i++) {
    char c = w[i];
    bool ok = (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
    if (c == ' ') {
      if (!enPalabra) return false;           // dos espacios seguidos o espacio al final
      enPalabra = false;
    } else if (ok) {
      if (!enPalabra) palabras++;
      enPalabra = true;
    } else return false;
  }
  return enPalabra && palabras >= 1 && palabras <= 4;  // AUTO | BOMBA ON 600 | LUZ 70 600
}

bool ackPendiente(long id) {
  for (int i = 0; i < ackCount; i++) if (ackIds[i] == id) return true;
  return false;
}

// ---------- NUBE ----------
// POST /rest/v1/rpc/<fn>. El cuerpo lleva la llave del dispositivo: nunca se imprime.
int rpc(const char *fn, JsonDocument &body, String &respuesta) {
  leerMega();                                 // vaciar el buffer del Mega antes de bloquear
  body["p_device_id"] = DEVICE_ID;
  body["p_key"] = DEVICE_KEY;
  String payload;
  serializeJson(body, payload);
  int status = -1;
  if (http.begin(tls, String(SUPABASE_URL) + "/rest/v1/rpc/" + fn)) {
    http.addHeader("apikey", SUPABASE_ANON_KEY);
    http.addHeader("Content-Type", "application/json");
    status = http.POST(payload);
    respuesta = status > 0 ? http.getString() : http.errorToString(status);
    http.end();
  } else {
    respuesta = "no se pudo abrir la conexion";
  }
  if (status < 200 || status >= 300) tls.stop();  // no reutilizar una conexion a medias
  registrarResultado(status);
  leerMega();
  return status;
}

bool reintentable(int status) { return status < 0 || status >= 500 || status == 408 || status == 429; }

// Devuelve false si hubo fallo de red (el bucle espera al backoff).
bool enviarTrama() {
  lastIngest = millis();
  sendNextFrame = false;
  JsonDocument body;
  body["p_frame"] = serialized(lastFrame);    // ya es JSON valido (lo serializo ArduinoJson)
  body["p_fw_version"] = FW_VERSION;
  String resp;
  int status = rpc("device_ingest", body, resp);
  if (reintentable(status)) {
    Serial.println("[nube] sin respuesta (" + String(status) + "): " + resp.substring(0, 120));
    return false;
  }
  frameSent = true;                           // 4xx: la nube la rechazo (28000 llave, 22023 trama); no reintentar
  if (status == 200) Serial.println("[nube] trama OK " + resp);
  else Serial.println("[nube] trama RECHAZADA " + String(status) + ": " + resp.substring(0, 200));
  return true;
}

void traerComandos() {
  JsonDocument body;
  String resp;
  int status = rpc("device_pull_commands", body, resp);
  if (status != 200) {
    if (!reintentable(status)) Serial.println("[cmd] error " + String(status) + ": " + resp.substring(0, 200));
    return;
  }
  JsonDocument cmds;
  if (deserializeJson(cmds, resp) || !cmds.is<JsonArray>()) return;
  for (JsonObject c : cmds.as<JsonArray>()) {
    long long id = c["id"].as<long long>();
    const char *wire = c["wire"];
    if (!wireValido(wire, id)) { Serial.println("[cmd] ignorado (formato)"); continue; }
    if (ackPendiente((long)id)) continue;    // el Mega ya respondio; su ACK aun no llega a la nube
    if (cmdCount == QUEUE) { Serial.println("[cmd] cola llena: la nube lo reentrega"); break; }
    cmdQueue[cmdCount++] = wire;
  }
}

void encolarAck(long id, const String &ack) {
  if (ackPendiente(id)) return;
  if (ackCount == QUEUE) {                    // cola llena: se pierde el mas viejo (la nube reentrega)
    for (int i = 1; i < QUEUE; i++) { ackQueue[i - 1] = ackQueue[i]; ackIds[i - 1] = ackIds[i]; }
    ackCount--;
  }
  ackQueue[ackCount] = ack;
  ackIds[ackCount++] = id;
}

// Devuelve false si quedo alguno pendiente por fallo de red.
bool enviarAcks() {
  while (ackCount > 0) {
    JsonDocument body;
    body["p_ack"] = serialized(ackQueue[0]);
    String resp;
    int status = rpc("device_ack", body, resp);
    if (reintentable(status)) { Serial.println("[ack] pendiente (" + String(status) + ")"); return false; }
    Serial.println((status == 200 ? String("[ack] OK ") : "[ack] rechazado " + String(status) + ": ") + resp.substring(0, 160));
    for (int i = 1; i < ackCount; i++) { ackQueue[i - 1] = ackQueue[i]; ackIds[i - 1] = ackIds[i]; }
    ackCount--;
  }
  return true;
}

// ---------- RFID ----------
void encolarRfid(const String &ev) {
  if (rfidCount == QUEUE) {                   // cola llena (mucho tiempo sin red): se pierde el mas viejo
    for (int i = 1; i < QUEUE; i++) rfidQueue[i - 1] = rfidQueue[i];
    rfidCount--;
  }
  rfidQueue[rfidCount++] = ev;
}

// Devuelve false si quedo alguno pendiente por fallo de red.
bool enviarEventosRfid() {
  while (rfidCount > 0) {
    JsonDocument body;
    body["p_event"] = serialized(rfidQueue[0]);
    String resp;
    int status = rpc("device_rfid_event", body, resp);
    if (reintentable(status)) { Serial.println("[rfid] intento pendiente (" + String(status) + ")"); return false; }
    Serial.println((status == 200 ? String("[rfid] registrado ") : "[rfid] rechazado " + String(status) + ": ") + resp.substring(0, 160));
    for (int i = 1; i < rfidCount; i++) rfidQueue[i - 1] = rfidQueue[i];
    rfidCount--;
  }
  return true;
}

bool soloHex(const char *s) {
  size_t n = strlen(s);
  if (n != 8 && n != 14 && n != 20) return false;
  for (size_t i = 0; i < n; i++) if (!isxdigit((unsigned char)s[i])) return false;
  return true;
}

// Compara la version de la nube con la del Mega y, si cambio, le escribe la lista.
void sincronizarTarjetas() {
  lastCards = millis();

  // 1) Saber que version tiene el Mega (al arrancar y cada 10 min)
  if (millis() - lastCardsAsk >= CARDS_ASK_MS) { megaCardsVer = -1; megaCardsAsked = false; }
  if (megaCardsVer < 0 && !megaCardsAsked) {
    syncLines[0] = "@CARDS?"; syncCount = 1; syncIdx = 0;
    megaCardsAsked = true; lastCardsAsk = millis();
    lastCards = millis() - CARDS_MS + 2000;   // la respuesta llega en menos de 2 s
    return;
  }

  // 2) Lista vigente en la nube
  JsonDocument body;
  if (megaCardsVer >= 0) body["p_mega_version"] = megaCardsVer;
  String resp;
  int status = rpc("device_pull_cards", body, resp);
  if (status != 200) {
    if (!reintentable(status)) Serial.println("[rfid] lista: error " + String(status) + ": " + resp.substring(0, 200));
    return;
  }
  JsonDocument d;
  if (deserializeJson(d, resp) || !d["ver"].is<long>() || !d["cards"].is<JsonArray>()) {
    Serial.println("[rfid] lista con formato inesperado: " + resp.substring(0, 120));
    return;
  }
  long ver = d["ver"].as<long>();
  if (ver == megaCardsVer) return;            // el Mega ya esta al dia

  // 3) Armar las lineas: @CARDS <ver> <n> / @CARD <uid> <nombre> / @END <ver>
  String cards[SYNC_MAX];
  int n = 0;
  for (JsonObject c : d["cards"].as<JsonArray>()) {
    const char *uid = c["uid"] | "";
    const char *name = c["name"] | "";
    if (!soloHex(uid) || n >= 20) continue;
    String l = String("@CARD ") + uid;
    String nombre;
    for (const char *p = name; *p && nombre.length() < 10; p++) if (isalnum((unsigned char)*p)) nombre += *p;
    if (nombre.length()) l += " " + nombre;
    cards[n++] = l;
  }
  syncCount = 0; syncIdx = 0;
  syncLines[syncCount++] = "@CARDS " + String(ver) + " " + String(n);
  for (int i = 0; i < n; i++) syncLines[syncCount++] = cards[i];
  syncLines[syncCount++] = "@END " + String(ver);
  Serial.println("[rfid] lista v" + String(ver) + " (" + String(n) + " tarjetas) -> Mega (tenia v" + String(megaCardsVer) + ")");
}
