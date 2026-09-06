const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '.')));

// Solo 127.0.0.1: este servidor sirve el arbol entero del repo, incluidos los
// archivos sin versionar. Con 0.0.0.0 se lo llevaba cualquier dispositivo de la
// LAN, y la LAN tiene segmento IoT y camara.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor local en http://127.0.0.1:${PORT} (solo esta maquina)`);
});
