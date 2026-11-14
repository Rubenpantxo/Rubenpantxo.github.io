// Deshacer/rehacer por instantáneas. Los documentos son pequeños (decenas de
// piezas), así que guardar el JSON entero es más robusto que un registro de
// órdenes inversas y no puede desincronizarse.

export class Historial {
    constructor(limite = 200) {
        this.limite = limite;
        this.pila = [];
        this.indice = -1;
    }

    reiniciar(doc) {
        this.pila = [JSON.stringify(doc)];
        this.indice = 0;
    }

    // Registra el estado actual. Devuelve false si no cambió nada.
    confirmar(doc) {
        const foto = JSON.stringify(doc);
        if (this.pila[this.indice] === foto) return false;
        this.pila.length = this.indice + 1;
        this.pila.push(foto);
        if (this.pila.length > this.limite) this.pila.shift();
        this.indice = this.pila.length - 1;
        return true;
    }

    get puedeDeshacer() { return this.indice > 0; }
    get puedeRehacer() { return this.indice < this.pila.length - 1; }

    deshacer() {
        if (!this.puedeDeshacer) return null;
        return JSON.parse(this.pila[--this.indice]);
    }

    rehacer() {
        if (!this.puedeRehacer) return null;
        return JSON.parse(this.pila[++this.indice]);
    }
}
