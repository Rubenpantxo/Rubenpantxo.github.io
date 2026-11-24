// Código de ejemplo de los proyectos (PlatformIO; compila con Arduino-ESP32 3.x,
// el de la plataforma espressif32 actual, y con 2.x).
//
// Cada ejemplo usa las macros del pines.h que Lab Studio genera a partir del
// cableado del montaje (PIN_<ref>_<pin>) y de los GPIO fijos de la placa
// (CYD_*). Si cambias un cable en la mesa, descarga otra vez pines.h y el
// código sigue cuadrando. Las pruebas comprueban que toda macro usada existe.
//
// `libs` se añade al lib_deps del platformio.ini de la placa; `archivos` son
// [ruta en el proyecto PlatformIO, contenido].

// Arranque común de la CYD: pantalla ILI9341 con TFT_eSPI (configurada en los
// build_flags) y táctil XPT2046 en su propio bus SPI.
const BASE_CYD = String.raw`#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include "pines.h"  // panel Código de Lab Studio → Descargar, y a la carpeta include/

// Las fuentes integradas de TFT_eSPI solo traen ASCII: los textos de pantalla van sin tildes.
TFT_eSPI tft;
SPIClass spiTactil(VSPI);
XPT2046_Touchscreen tactil(CYD_TOUCH_CS, CYD_TOUCH_IRQ);

void iniciarPantalla() {
  tft.init();
  tft.setRotation(1);  // apaisada: 320 x 240
  tft.fillScreen(TFT_BLACK);
  spiTactil.begin(CYD_TOUCH_CLK, CYD_TOUCH_MISO, CYD_TOUCH_MOSI, CYD_TOUCH_CS);
  tactil.begin(spiTactil);
  tactil.setRotation(1);
}

// Dedo en la pantalla ahora mismo, en píxeles. Si el toque sale desplazado,
// ajusta los extremos del map() con los valores crudos de tu panel.
bool pulsado(int &x, int &y) {
  if (!(tactil.tirqTouched() && tactil.touched())) return false;
  TS_Point p = tactil.getPoint();
  x = constrain(map(p.x, 200, 3700, 0, 319), 0, 319);
  y = constrain(map(p.y, 240, 3800, 0, 239), 0, 239);
  return true;
}

// Igual, pero solo una vez por pulsación (para botones).
bool toque(int &x, int &y) {
  static bool antes = false;
  bool ahora = pulsado(x, y);
  bool nuevo = ahora && !antes;
  antes = ahora;
  return nuevo;
}

struct Boton { int x, y, w, h; const char *texto; };

bool dentro(const Boton &b, int x, int y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }

void pintarBoton(const Boton &b, uint16_t fondo, uint8_t fuente = 2) {
  tft.fillRoundRect(b.x, b.y, b.w, b.h, 8, fondo);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, fondo);
  tft.drawString(b.texto, b.x + b.w / 2, b.y + b.h / 2, fuente);
}
`;

const ZONA_HORARIA = 'CET-1CEST,M3.5.0,M10.5.0/3';

const METEO = String.raw`// Estación meteorológica: BME280 en CN1, gráfica de 24 h, brillo por la LDR y MQTT.
${BASE_CYD}
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <PubSubClient.h>

const char *WIFI_SSID = "TU_WIFI";
const char *WIFI_CLAVE = "TU_CLAVE";
const char *MQTT_SERVIDOR = "192.168.1.10";  // el broker de Home Assistant
const char *MQTT_TEMA = "casa/meteo";

Adafruit_BME280 bme;
WiFiClient wifi;
PubSubClient mqtt(wifi);

// 24 h de historia con una muestra cada 5 min: 288 muestras, un píxel cada una.
constexpr int MUESTRAS = 288;
float hist[3][MUESTRAS];
int ocupadas = 0, cabeza = 0;
int vista = 0;  // 0 temperatura, 1 humedad, 2 presión: cambia al tocar la pantalla
const char *NOMBRE[3] = {"Temperatura (C)", "Humedad (%)", "Presion (hPa)"};
const uint16_t COLOR[3] = {TFT_ORANGE, TFT_CYAN, TFT_GREENYELLOW};
float t, h, p;

void leer() {
  t = bme.readTemperature();
  h = bme.readHumidity();
  p = bme.readPressure() / 100.0f;
}

void guardarMuestra() {
  hist[0][cabeza] = t;
  hist[1][cabeza] = h;
  hist[2][cabeza] = p;
  cabeza = (cabeza + 1) % MUESTRAS;
  if (ocupadas < MUESTRAS) ocupadas++;
}

void pintarCabecera() {
  tft.fillRect(0, 0, 320, 70, TFT_BLACK);
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(TFT_ORANGE, TFT_BLACK);
  tft.drawFloat(t, 1, 8, 8, 4);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.drawFloat(h, 0, 116, 8, 4);
  tft.setTextColor(TFT_GREENYELLOW, TFT_BLACK);
  tft.drawFloat(p, 0, 204, 8, 4);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("C", 76, 12, 2);
  tft.drawString("%", 152, 12, 2);
  tft.drawString("hPa", 268, 12, 2);
  tft.drawString(NOMBRE[vista], 8, 48, 2);
  tft.drawString(mqtt.connected() ? "MQTT ok" : "sin MQTT", 240, 48, 2);
}

void pintarGrafica() {
  const int X = 16, Y = 76, W = MUESTRAS, H = 150;
  tft.fillRect(0, Y - 1, 320, 240 - Y + 1, TFT_BLACK);
  tft.drawRect(X - 1, Y - 1, W + 2, H + 2, TFT_DARKGREY);
  if (ocupadas < 2) return;
  float mn = 1e9, mx = -1e9;
  for (int i = 0; i < ocupadas; i++) {
    mn = min(mn, hist[vista][i]);
    mx = max(mx, hist[vista][i]);
  }
  if (mx - mn < 1) { mn -= 0.5f; mx += 0.5f; }
  int x0 = X + W - ocupadas, yAnt = -1;  // la muestra más reciente, a la derecha
  for (int i = 0; i < ocupadas; i++) {
    int k = (cabeza - ocupadas + i + MUESTRAS) % MUESTRAS;
    int y = Y + H - 1 - (int)((hist[vista][k] - mn) / (mx - mn) * (H - 1));
    if (yAnt >= 0) tft.drawLine(x0 + i - 1, yAnt, x0 + i, y, COLOR[vista]);
    yAnt = y;
  }
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.setTextDatum(TL_DATUM);
  tft.drawFloat(mx, 1, X + 3, Y + 3, 1);
  tft.drawFloat(mn, 1, X + 3, Y + H - 11, 1);
  tft.drawString("-24 h", X, Y + H + 4, 1);
  tft.setTextDatum(TR_DATUM);
  tft.drawString("ahora", X + W, Y + H + 4, 1);
}

// Retroiluminación por PWM: la API del LEDC cambió en Arduino-ESP32 3.x.
void iniciarBrillo() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(CYD_TFT_BL, 5000, 8);
#else
  ledcSetup(0, 5000, 8);
  ledcAttachPin(CYD_TFT_BL, 0);
#endif
}

void fijarBrillo(uint8_t valor) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(CYD_TFT_BL, valor);
#else
  ledcWrite(0, valor);
#endif
}

void ajustarBrillo() {
  // La LDR da lecturas bajas con mucha luz y altas a oscuras: calibra los extremos en tu habitación.
  int luz = analogRead(CYD_LDR);
  fijarBrillo(constrain(map(luz, 0, 400, 255, 30), 30, 255));
}

void mantenerMqtt() {
  static uint32_t intento = 0;
  if (WiFi.status() != WL_CONNECTED || mqtt.connected() || millis() - intento < 5000) return;
  intento = millis();
  if (mqtt.connect("cyd-meteo")) pintarCabecera();
}

void publicar() {
  if (!mqtt.connected()) return;
  char json[96];
  snprintf(json, sizeof json, "{\"temperatura\":%.1f,\"humedad\":%.0f,\"presion\":%.1f}", t, h, p);
  mqtt.publish(MQTT_TEMA, json, true);
}

void setup() {
  Serial.begin(115200);
  iniciarPantalla();
  analogSetPinAttenuation(CYD_LDR, ADC_0db);
  iniciarBrillo();
  fijarBrillo(255);
  Wire.begin(PIN_S1_SDA, PIN_S1_SCL);  // CN1: SDA = GPIO27, SCL = GPIO22
  if (!bme.begin(0x76) && !bme.begin(0x77)) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.drawString("No encuentro el BME280 en CN1", 10, 110, 2);
    while (true) delay(1000);
  }
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);
  mqtt.setServer(MQTT_SERVIDOR, 1883);
  leer();
  guardarMuestra();
  pintarCabecera();
  pintarGrafica();
}

void loop() {
  static uint32_t tMinuto = 0, tMuestra = 0, tBrillo = 0;
  uint32_t ahora = millis();
  mantenerMqtt();
  mqtt.loop();
  if (ahora - tBrillo >= 500) { tBrillo = ahora; ajustarBrillo(); }
  if (ahora - tMinuto >= 60000UL) { tMinuto = ahora; leer(); publicar(); pintarCabecera(); }
  if (ahora - tMuestra >= 300000UL) { tMuestra = ahora; guardarMuestra(); pintarGrafica(); }
  int x, y;
  if (toque(x, y)) { vista = (vista + 1) % 3; pintarCabecera(); pintarGrafica(); }
}
`;

const SHELLY = String.raw`// Panel de pared: enciende y apaga el Shelly 1PM Mini por RPC HTTP y muestra su consumo.
${BASE_CYD}
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

const char *WIFI_SSID = "TU_WIFI";
const char *WIFI_CLAVE = "TU_CLAVE";
const char *SHELLY = "http://192.168.1.50";  // IP del Shelly (dale una reserva DHCP en el router)

bool enLinea = false, encendida = false;
float vatios = 0, energia = 0, energiaBase = -1;  // Wh acumulados por el Shelly
int diaBase = -1;

const Boton INTERRUPTOR = {40, 16, 240, 124, ""};

// Llama a un método RPC del Shelly y deja la respuesta JSON en resp.
bool rpc(const char *metodo, JsonDocument &resp) {
  HTTPClient http;
  http.setTimeout(1500);
  http.begin(String(SHELLY) + "/rpc/" + metodo);
  bool ok = http.GET() == 200 && !deserializeJson(resp, http.getString());
  http.end();
  return ok;
}

void leerEstado() {
  JsonDocument r;
  enLinea = rpc("Switch.GetStatus?id=0", r);
  if (!enLinea) return;
  encendida = r["output"] | false;
  vatios = r["apower"] | 0.0f;
  energia = r["aenergy"]["total"] | 0.0f;
  // Energía del día: lo acumulado desde la medianoche (o desde que el Shelly se reinició).
  struct tm hora;
  if (getLocalTime(&hora, 0) && hora.tm_yday != diaBase) { diaBase = hora.tm_yday; energiaBase = energia; }
  if (energiaBase < 0 || energia < energiaBase) energiaBase = energia;
}

void pintar() {
  uint16_t fondo = !enLinea ? TFT_DARKGREY : encendida ? TFT_GOLD : 0x2104;
  tft.fillRoundRect(INTERRUPTOR.x, INTERRUPTOR.y, INTERRUPTOR.w, INTERRUPTOR.h, 16, fondo);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(encendida && enLinea ? TFT_BLACK : TFT_WHITE, fondo);
  if (enLinea) tft.drawString(encendida ? "ENCENDIDA" : "APAGADA", 160, 78, 4);
  else tft.drawString("El Shelly no responde", 160, 78, 2);
  tft.fillRect(0, 150, 320, 90, TFT_BLACK);
  char txt[32];
  snprintf(txt, sizeof txt, "%.1f W", vatios);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString(txt, 160, 176, 4);
  snprintf(txt, sizeof txt, "Hoy: %.2f kWh", (energia - energiaBase) / 1000.0f);
  tft.setTextColor(TFT_SILVER, TFT_BLACK);
  tft.drawString(txt, 160, 216, 2);
}

void setup() {
  Serial.begin(115200);
  iniciarPantalla();
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Conectando a la Wi-Fi...", 160, 120, 2);
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);
  while (WiFi.status() != WL_CONNECTED) delay(200);
  configTzTime("${ZONA_HORARIA}", "pool.ntp.org");
  tft.fillScreen(TFT_BLACK);
  leerEstado();
  pintar();
}

void loop() {
  static uint32_t tEstado = 0;
  int x, y;
  if (toque(x, y) && dentro(INTERRUPTOR, x, y)) {
    JsonDocument r;
    if (rpc("Switch.Toggle?id=0", r)) encendida = !(r["was_on"] | encendida);
    pintar();               // respuesta inmediata en pantalla
    tEstado = millis();     // y la potencia se relee en un segundo, ya estabilizada
  }
  if (millis() - tEstado >= 1000) { tEstado = millis(); leerEstado(); pintar(); }
}
`;

const MONITOR_PC = String.raw`// Monitor del PC: telemetría en JSON por el puerto serie del micro-USB (ver pc/monitor.py).
${BASE_CYD}
#include <ArduinoJson.h>

constexpr float UMBRAL_TEMP = 80;  // °C de CPU a partir de los que pita el zumbador
constexpr int PUNTOS = 60;         // un minuto de historia, un dato por segundo

float cpu[PUNTOS], ram[PUNTOS], rx[PUNTOS], tx[PUNTOS];
float temp = 0;
int cabeza = 0, pagina = 0;  // 0 CPU, 1 memoria, 2 red: se cambia tocando la pantalla
uint32_t ultimoDato = 0;
bool caliente = false;

int yDe(float v, float maximo, int Y, int H) { return Y + H - 1 - (int)(constrain(v / maximo, 0.0f, 1.0f) * (H - 1)); }

void grafica(const float *a, const float *b, float maximo, uint16_t ca, uint16_t cb) {
  const int X = 10, Y = 72, W = 300, H = 150;
  tft.fillRect(X, Y, W, H, TFT_BLACK);
  tft.drawRect(X - 1, Y - 1, W + 2, H + 2, TFT_DARKGREY);
  for (int i = 1; i < PUNTOS; i++) {  // de la muestra más antigua (cabeza) a la última
    int k0 = (cabeza + i - 1) % PUNTOS, k1 = (cabeza + i) % PUNTOS;
    int x0 = X + (i - 1) * (W - 1) / (PUNTOS - 1), x1 = X + i * (W - 1) / (PUNTOS - 1);
    tft.drawLine(x0, yDe(a[k0], maximo, Y, H), x1, yDe(a[k1], maximo, Y, H), ca);
    if (b) tft.drawLine(x0, yDe(b[k0], maximo, Y, H), x1, yDe(b[k1], maximo, Y, H), cb);
  }
}

void pintar() {
  int k = (cabeza + PUNTOS - 1) % PUNTOS;  // el último dato
  const char *TITULO[3] = {"CPU", "Memoria", "Red (kB/s)"};
  char txt[48];
  tft.fillRect(0, 0, 320, 68, TFT_BLACK);
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(TFT_SILVER, TFT_BLACK);
  tft.drawString(TITULO[pagina], 10, 6, 2);
  for (int i = 0; i < 3; i++) tft.fillCircle(280 + i * 14, 13, 4, i == pagina ? TFT_WHITE : TFT_DARKGREY);
  if (millis() - ultimoDato > 3000) {
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString("Esperando datos del PC...", 10, 34, 2);
    return;
  }
  if (pagina == 0) {
    snprintf(txt, sizeof txt, "%.0f %%   %.0f C", cpu[k], temp);
    tft.setTextColor(caliente ? TFT_RED : TFT_GREEN, TFT_BLACK);
    grafica(cpu, nullptr, 100, TFT_GREEN, 0);
  } else if (pagina == 1) {
    snprintf(txt, sizeof txt, "%.0f %%", ram[k]);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    grafica(ram, nullptr, 100, TFT_CYAN, 0);
  } else {
    float maximo = 10;
    for (int i = 0; i < PUNTOS; i++) maximo = max(maximo, max(rx[i], tx[i]) * 1.2f);
    snprintf(txt, sizeof txt, "baja %.0f  sube %.0f", rx[k], tx[k]);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    grafica(rx, tx, maximo, TFT_YELLOW, TFT_MAGENTA);
  }
  tft.drawString(txt, 10, 30, 4);
}

void leerSerie() {
  static char linea[256];
  static int n = 0;
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n') {
      if (n < (int)sizeof(linea) - 1) linea[n++] = c;
      continue;
    }
    linea[n] = 0;
    n = 0;
    JsonDocument d;
    if (deserializeJson(d, linea)) continue;  // línea incompleta: se descarta
    cpu[cabeza] = d["cpu"] | 0.0f;
    ram[cabeza] = d["ram"] | 0.0f;
    rx[cabeza] = d["rx"] | 0.0f;
    tx[cabeza] = d["tx"] | 0.0f;
    temp = d["temp"] | 0.0f;
    cabeza = (cabeza + 1) % PUNTOS;
    ultimoDato = millis();
    caliente = temp >= UMBRAL_TEMP;
    pintar();
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BZ1_I_O, OUTPUT);
  iniciarPantalla();
  pintar();
}

void loop() {
  leerSerie();
  if (caliente && millis() - ultimoDato > 5000) { caliente = false; pintar(); }  // el PC dejó de enviar
  digitalWrite(PIN_BZ1_I_O, caliente && (millis() / 250) % 4 == 0);  // pitido corto cada segundo
  int x, y;
  if (toque(x, y)) { pagina = (pagina + 1) % 3; pintar(); }
}
`;

const MONITOR_PY = String.raw`# Envía una línea JSON por segundo a la CYD con el uso del PC.
# pip install psutil pyserial
import json
import time

import psutil
import serial

PUERTO = "COM5"  # el del CH340 de la CYD; en Linux, /dev/ttyUSB0

def temperatura_cpu():
    # psutil solo da temperaturas en Linux y FreeBSD; en Windows devuelve 0.
    try:
        lecturas = psutil.sensors_temperatures()
        return max(s.current for grupo in lecturas.values() for s in grupo)
    except (AttributeError, ValueError):
        return 0

with serial.Serial(PUERTO, 115200) as cyd:
    time.sleep(2)  # abrir el puerto reinicia el ESP32: espera a que arranque
    red_antes = psutil.net_io_counters()
    while True:
        time.sleep(1)
        red = psutil.net_io_counters()
        datos = {
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "temp": temperatura_cpu(),
            "rx": (red.bytes_recv - red_antes.bytes_recv) / 1024,
            "tx": (red.bytes_sent - red_antes.bytes_sent) / 1024,
        }
        red_antes = red
        cyd.write((json.dumps(datos) + "\n").encode())
`;

const MANDO_IR = String.raw`// Mando universal: aprende códigos con el receptor (GPIO35) y los repite con el LED IR (GPIO22).
${BASE_CYD}
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>
#include <Preferences.h>

// Aparatos y botones: cámbialos por los tuyos.
const char *APARATOS[] = {"TV", "Aire", "Equipo"};
const char *BOTONES[] = {"On/Off", "Vol +", "Vol -", "Canal +", "Canal -", "Silencio"};
constexpr int N_APARATOS = 3, N_BOTONES = 6;

IRrecv receptor(PIN_IR1_OUT, 1024, 50, true);
IRsend emisor(PIN_IR2_DAT);
decode_results captura;
Preferences memoria;  // los códigos se guardan en la flash (NVS): sobreviven a apagar y reprogramar

struct Codigo { uint16_t protocolo; uint16_t bits; uint64_t valor; };
int aparato = 0;
bool aprendiendo = false;
int esperando = -1;  // botón que espera un código del mando original

Boton pestana(int i) { return {4 + i * 80, 4, 76, 32, APARATOS[i]}; }
const Boton APRENDER = {248, 4, 68, 32, "Aprender"};
Boton celda(int i) { return {6 + (i % 3) * 104, 44 + (i / 3) * 98, 100, 90, BOTONES[i]}; }

String clave(int a, int b) { return "c" + String(a) + "_" + String(b); }
bool leerCodigo(int a, int b, Codigo &c) { return memoria.getBytes(clave(a, b).c_str(), &c, sizeof c) == sizeof c; }

void pintar() {
  tft.fillScreen(TFT_BLACK);
  for (int i = 0; i < N_APARATOS; i++) pintarBoton(pestana(i), i == aparato ? TFT_BLUE : 0x2104);
  pintarBoton(APRENDER, aprendiendo ? TFT_RED : 0x2104);
  for (int i = 0; i < N_BOTONES; i++) {
    Codigo c;
    // Naranja: esperando el mando. Turquesa: tiene código. Gris: vacío.
    uint16_t fondo = i == esperando ? TFT_ORANGE : leerCodigo(aparato, i, c) ? TFT_DARKCYAN : TFT_DARKGREY;
    pintarBoton(celda(i), fondo);
  }
}

void enviar(int b) {
  Codigo c;
  if (!leerCodigo(aparato, b, c)) return;
  pintarBoton(celda(b), TFT_GREEN);
  emisor.send((decode_type_t)c.protocolo, c.valor, c.bits);
  delay(120);
  pintarBoton(celda(b), TFT_DARKCYAN);
}

void setup() {
  Serial.begin(115200);
  iniciarPantalla();
  memoria.begin("mando-ir");
  receptor.enableIRIn();
  emisor.begin();
  pintar();
}

void loop() {
  int x, y;
  if (toque(x, y)) {
    for (int i = 0; i < N_APARATOS; i++)
      if (dentro(pestana(i), x, y)) { aparato = i; esperando = -1; pintar(); return; }
    if (dentro(APRENDER, x, y)) { aprendiendo = !aprendiendo; esperando = -1; pintar(); return; }
    for (int i = 0; i < N_BOTONES; i++)
      if (dentro(celda(i), x, y)) {
        if (aprendiendo) { esperando = i; receptor.resume(); pintar(); }
        else enviar(i);
        return;
      }
  }
  if (esperando >= 0 && receptor.decode(&captura)) {
    // Protocolos de un solo valor (NEC, Sony, RC5, Samsung…). Los de aire acondicionado
    // mandan el estado completo en cada pulsación y necesitan guardar captura.state.
    if (captura.decode_type != UNKNOWN && !hasACState(captura.decode_type) && !captura.repeat) {
      Codigo c = {(uint16_t)captura.decode_type, captura.bits, captura.value};
      memoria.putBytes(clave(aparato, esperando).c_str(), &c, sizeof c);
      Serial.printf("%s / %s: %s\n", APARATOS[aparato], BOTONES[esperando], resultToHumanReadableBasic(&captura).c_str());
      esperando = -1;
      pintar();
    }
    receptor.resume();
  }
}
`;

const TERMOSTATO = String.raw`// Termostato: DS18B20 por 1-Wire (GPIO27), histéresis, horario semanal y relé de la caldera (GPIO22).
${BASE_CYD}
#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Preferences.h>
#include <time.h>

const char *WIFI_SSID = "TU_WIFI";  // solo para poner el reloj en hora (NTP)
const char *WIFI_CLAVE = "TU_CLAVE";

constexpr float HISTERESIS = 0.5;         // ± °C alrededor de la consigna
constexpr float REDUCCION = 3.0;          // fuera del horario de confort, consigna − 3 °C
constexpr uint32_t PAUSA_RELE = 120000;   // ms mínimos antes de volver a encender la caldera
// Horario de confort por día (0 = domingo): hora de inicio y hora de fin.
// Para editarlo desde la pantalla, guárdalo con memoria.putBytes() como la consigna.
const uint8_t HORARIO[7][2] = {{9, 23}, {6, 22}, {6, 22}, {6, 22}, {6, 22}, {6, 23}, {9, 23}};

OneWire bus(PIN_S1_DQ);
DallasTemperature sonda(&bus);
Preferences memoria;

enum Modo { MODO_AUTO, MODO_CONFORT, MODO_APAGADO };
const char *TXT_MODO[] = {"Auto", "Confort", "Apagado"};
Modo modo = MODO_AUTO;
float consigna = 21.0, temperatura = NAN;
bool calor = false;
uint32_t ultimoEncendido = 0;

const Boton MENOS = {8, 180, 70, 52, "-"};
const Boton MAS = {86, 180, 70, 52, "+"};
const Boton CAMBIAR_MODO = {200, 180, 112, 52, ""};

void rele(bool pedirCalor) {
  if (pedirCalor == calor) return;
  if (pedirCalor && ultimoEncendido && millis() - ultimoEncendido < PAUSA_RELE) return;
  calor = pedirCalor;
  if (calor) ultimoEncendido = millis();
  digitalWrite(PIN_K1_IN1, calor ? LOW : HIGH);  // la entrada del relé es activa a nivel bajo
}

float consignaActiva(bool &confort) {
  confort = true;
  struct tm h;
  if (modo == MODO_AUTO && getLocalTime(&h, 0)) confort = h.tm_hour >= HORARIO[h.tm_wday][0] && h.tm_hour < HORARIO[h.tm_wday][1];
  return confort ? consigna : consigna - REDUCCION;
}

void regular() {
  bool confort;
  float c = consignaActiva(confort);
  if (modo == MODO_APAGADO || isnan(temperatura)) rele(false);  // sin sonda, caldera parada
  else if (temperatura < c - HISTERESIS) rele(true);
  else if (temperatura > c + HISTERESIS) rele(false);
}

void pintarDatos() {
  bool confort;
  float c = consignaActiva(confort);
  tft.fillRect(0, 0, 320, 172, TFT_BLACK);
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(TFT_SILVER, TFT_BLACK);
  tft.drawString("Temperatura", 10, 2, 2);
  tft.drawString("Consigna", 200, 2, 2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  if (isnan(temperatura)) tft.drawString("Sin sonda", 10, 30, 4);
  else tft.drawFloat(temperatura, 1, 10, 24, 7);  // fuente de 7 segmentos, 48 px
  tft.setTextColor(TFT_ORANGE, TFT_BLACK);
  tft.drawFloat(c, 1, 200, 22, 4);
  tft.setTextColor(TFT_SILVER, TFT_BLACK);
  tft.drawString(modo == MODO_APAGADO ? "Apagado" : confort ? "Confort" : "Reducido", 200, 52, 2);
  struct tm h;
  char reloj[16];
  if (getLocalTime(&h, 0)) {
    strftime(reloj, sizeof reloj, "%H:%M", &h);
    tft.drawString(reloj, 200, 72, 2);
  }
  uint16_t fondo = calor ? TFT_RED : 0x2104;
  tft.fillRoundRect(10, 100, 300, 64, 10, fondo);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, fondo);
  tft.drawString(calor ? "Caldera: pidiendo calor" : "Caldera: en reposo", 160, 132, 2);
}

void pintarBotones() {
  pintarBoton(MENOS, 0x2104, 4);
  pintarBoton(MAS, 0x2104, 4);
  pintarBoton({CAMBIAR_MODO.x, CAMBIAR_MODO.y, CAMBIAR_MODO.w, CAMBIAR_MODO.h, TXT_MODO[modo]}, TFT_BLUE, 4);
}

void leerSonda() {
  static uint32_t pedido = 0, ciclo = 0;
  uint32_t ahora = millis();
  if (!pedido && ahora - ciclo >= 5000) {
    ciclo = ahora;
    sonda.requestTemperatures();  // no bloquea: la conversión de 12 bits tarda 750 ms
    pedido = ahora | 1;
  } else if (pedido && ahora - pedido >= 800) {
    pedido = 0;
    float t = sonda.getTempCByIndex(0);
    temperatura = t == DEVICE_DISCONNECTED_C ? NAN : t;
    regular();
    pintarDatos();
  }
}

void setup() {
  digitalWrite(PIN_K1_IN1, HIGH);  // relé abierto antes de convertir el pin en salida
  pinMode(PIN_K1_IN1, OUTPUT);
  Serial.begin(115200);
  iniciarPantalla();
  memoria.begin("termostato");
  consigna = memoria.getFloat("consigna", 21.0);
  modo = (Modo)memoria.getUChar("modo", MODO_AUTO);
  sonda.begin();
  sonda.setWaitForConversion(false);
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);  // sin esperar: el termostato regula aunque no haya red
  configTzTime("${ZONA_HORARIA}", "pool.ntp.org");
  pintarDatos();
  pintarBotones();
}

void loop() {
  leerSonda();
  int x, y;
  if (!toque(x, y)) return;
  if (dentro(MENOS, x, y)) consigna = max(5.0f, consigna - 0.5f);
  else if (dentro(MAS, x, y)) consigna = min(30.0f, consigna + 0.5f);
  else if (dentro(CAMBIAR_MODO, x, y)) modo = (Modo)((modo + 1) % 3);
  else return;
  memoria.putFloat("consigna", consigna);
  memoria.putUChar("modo", modo);
  regular();
  pintarDatos();
  pintarBotones();
}
`;

const SERVOS = String.raw`// Consola del brazo: cuatro deslizadores, movimiento suavizado y grabación de secuencias.
${BASE_CYD}
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca(0x40);

constexpr int N = 4;
const char *NOMBRE[N] = {"Base", "Hombro", "Codo", "Pinza"};
// Pulso en µs para 0° y 180°: calíbralos servo a servo (MG996R en 0 y 1, SG90 en 2 y 3).
const uint16_t US_MIN[N] = {500, 500, 500, 500};
const uint16_t US_MAX[N] = {2500, 2500, 2400, 2400};
// Recorrido permitido de cada articulación, para no forzar la estructura.
const uint8_t GRADOS_MIN[N] = {0, 15, 0, 10};
const uint8_t GRADOS_MAX[N] = {180, 165, 180, 90};
constexpr float VELOCIDAD = 2.0;  // grados por ciclo de 20 ms: 100 °/s como mucho

float actual[N] = {90, 90, 90, 50}, objetivo[N] = {90, 90, 90, 50};
constexpr int MAX_PASOS = 40;
uint8_t secuencia[MAX_PASOS][N];
int pasos = 0, pasoActual = 0;
bool reproduciendo = false;
uint32_t llegada = 0;

const int PISTA_X = 80, PISTA_W = 220;
int filaY(int i) { return 8 + i * 44; }
const Boton GRABAR = {8, 190, 96, 44, "Grabar"};
const Boton REPRODUCIR = {112, 190, 96, 44, "Reproducir"};
const Boton BORRAR = {216, 190, 96, 44, "Borrar"};

void mover(int i, float grados) { pca.writeMicroseconds(i, US_MIN[i] + (US_MAX[i] - US_MIN[i]) * grados / 180.0f); }

void pintarDeslizador(int i) {
  int y = filaY(i);
  tft.fillRect(0, y, 320, 36, TFT_BLACK);
  tft.setTextDatum(ML_DATUM);
  tft.setTextColor(TFT_SILVER, TFT_BLACK);
  tft.drawString(NOMBRE[i], 6, y + 10, 2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawNumber((int)objetivo[i], 6, y + 28, 2);
  tft.fillRoundRect(PISTA_X, y + 15, PISTA_W, 6, 3, TFT_DARKGREY);
  int x = PISTA_X + (objetivo[i] - GRADOS_MIN[i]) * PISTA_W / (GRADOS_MAX[i] - GRADOS_MIN[i]);
  tft.fillCircle(x, y + 18, 12, TFT_ORANGE);
}

void pintarBotones() {
  static char txt[16];
  snprintf(txt, sizeof txt, "Grabar (%d)", pasos);
  pintarBoton({GRABAR.x, GRABAR.y, GRABAR.w, GRABAR.h, txt}, pasos < MAX_PASOS ? 0x2104 : TFT_DARKGREY);
  pintarBoton(REPRODUCIR, reproduciendo ? TFT_DARKGREEN : 0x2104);
  pintarBoton(BORRAR, 0x2104);
}

void pulsarBoton(int x, int y) {
  if (dentro(GRABAR, x, y) && pasos < MAX_PASOS) {
    for (int i = 0; i < N; i++) secuencia[pasos][i] = (uint8_t)objetivo[i];
    pasos++;
  } else if (dentro(REPRODUCIR, x, y) && pasos) {
    reproduciendo = !reproduciendo;
    pasoActual = pasos - 1;  // el siguiente paso será el primero
    llegada = 0;
  } else if (dentro(BORRAR, x, y)) {
    pasos = 0;
    reproduciendo = false;
  } else return;
  pintarBotones();
}

void atenderTactil() {
  static int arrastre = -1;
  static bool antes = false;
  int x, y;
  if (!pulsado(x, y)) { arrastre = -1; antes = false; return; }
  if (!antes) {  // comienzo de la pulsación: ¿deslizador o botón?
    antes = true;
    for (int i = 0; i < N; i++)
      if (y >= filaY(i) && y < filaY(i) + 36 && x >= PISTA_X - 16) arrastre = i;
    if (arrastre < 0) { pulsarBoton(x, y); return; }
  }
  if (arrastre < 0) return;
  if (reproduciendo) { reproduciendo = false; pintarBotones(); }
  int i = arrastre;
  float g = GRADOS_MIN[i] + (float)(constrain(x, PISTA_X, PISTA_X + PISTA_W) - PISTA_X) * (GRADOS_MAX[i] - GRADOS_MIN[i]) / PISTA_W;
  if (fabsf(g - objetivo[i]) >= 1) { objetivo[i] = g; pintarDeslizador(i); }
}

bool enPosicion() {
  for (int i = 0; i < N; i++) if (fabsf(actual[i] - objetivo[i]) > 0.5f) return false;
  return true;
}

void reproducir() {
  if (!reproduciendo || !enPosicion()) { llegada = 0; return; }
  if (!llegada) { llegada = millis(); return; }
  if (millis() - llegada < 400) return;  // pausa en cada posición grabada
  pasoActual = (pasoActual + 1) % pasos;
  for (int i = 0; i < N; i++) { objetivo[i] = secuencia[pasoActual][i]; pintarDeslizador(i); }
  llegada = 0;
}

void setup() {
  Serial.begin(115200);
  iniciarPantalla();
  Wire.begin(PIN_U2_SDA, PIN_U2_SCL);  // CN1: SDA = GPIO27, SCL = GPIO22
  Wire.beginTransmission(0x40);
  if (Wire.endTransmission() != 0) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.drawString("No encuentro el PCA9685 en 0x40", 10, 110, 2);
    while (true) delay(1000);
  }
  pca.begin();
  pca.setOscillatorFrequency(27000000);
  pca.setPWMFreq(50);  // 50 Hz: el periodo de los servos
  for (int i = 0; i < N; i++) { mover(i, actual[i]); pintarDeslizador(i); }
  pintarBotones();
}

void loop() {
  static uint32_t ciclo = 0;
  atenderTactil();
  if (millis() - ciclo < 20) return;
  ciclo = millis();
  for (int i = 0; i < N; i++) {
    float d = constrain(objetivo[i] - actual[i], -VELOCIDAD, VELOCIDAD);
    if (d != 0) { actual[i] += d; mover(i, actual[i]); }
  }
  reproducir();
}
`;

export const EJEMPLOS = {
    'cyd-meteo': {
        libs: ['adafruit/Adafruit BME280 Library', 'adafruit/Adafruit Unified Sensor', 'knolleary/PubSubClient'],
        archivos: [['src/main.cpp', METEO]]
    },
    'cyd-shelly': { libs: ['bblanchon/ArduinoJson@^7'], archivos: [['src/main.cpp', SHELLY]] },
    'cyd-monitor-pc': { libs: ['bblanchon/ArduinoJson@^7'], archivos: [['src/main.cpp', MONITOR_PC], ['pc/monitor.py', MONITOR_PY]] },
    'cyd-mando-ir': { libs: ['crankyoldgit/IRremoteESP8266'], archivos: [['src/main.cpp', MANDO_IR]] },
    'cyd-termostato': { libs: ['paulstoffregen/OneWire', 'milesburton/DallasTemperature'], archivos: [['src/main.cpp', TERMOSTATO]] },
    'cyd-servos': { libs: ['adafruit/Adafruit PWM Servo Driver Library'], archivos: [['src/main.cpp', SERVOS]] }
};
