// =================================================================
// === JUEGO 2: SUDOKU =============================================
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES Y CONSTANTES ---
    const sudokuContainer = document.getElementById('sudokuContainer');
    const selectorSudoku = document.getElementById('selectorSudoku');
    const tecladoNumerico = document.getElementById('tecladoNumerico');
    const corregirBtn = document.getElementById('corregirSudoku');
    const resultadoSpan = document.getElementById('resultadoSudoku');
    
    let celdaSeleccionada = null;
    let puzzles = []; // Almacenará los puzzles y sus soluciones
    let puzzleActual = [];
    let solucionActual = [];

    // --- DATOS DE LOS PUZZLES ---
    // Estructura: 'puzzle' con 0 para celdas vacías, 'solucion' completo.
    // Puedes añadir más o cargarlos desde un archivo JSON.
    const SUDOKU_DATA = [
        { // Fácil
            puzzle: [
                [5,3,0,0,7,0,0,0,0], [6,0,0,1,9,5,0,0,0], [0,9,8,0,0,0,0,6,0],
                [8,0,0,0,6,0,0,0,3], [4,0,0,8,0,3,0,0,1], [7,0,0,0,2,0,0,0,6],
                [0,6,0,0,0,0,2,8,0], [0,0,0,4,1,9,0,0,5], [0,0,0,0,8,0,0,7,9]
            ],
            solucion: [
                [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
                [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
                [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
            ]
        },
        { // Medio (añade más aquí)
            puzzle: [
                [0,2,0,6,0,8,0,0,0], [5,8,0,0,0,9,7,0,0], [0,0,0,0,4,0,0,0,0],
                [3,7,0,0,0,0,5,0,0], [6,0,0,0,0,0,0,0,4], [0,0,8,0,0,0,0,1,3],
                [0,0,0,0,2,0,0,0,0], [0,0,9,8,0,0,0,3,6], [0,0,0,3,0,6,0,9,0]
            ],
            solucion: [
                [1,2,3,6,7,8,9,4,5], [5,8,4,2,3,9,7,6,1], [9,6,7,1,4,5,3,2,8],
                [3,7,2,4,6,1,5,8,9], [6,9,1,5,8,3,2,7,4], [4,5,8,7,9,2,6,1,3],
                [8,3,6,9,2,4,1,5,7], [2,1,9,8,5,7,4,3,6], [7,4,5,3,1,6,8,9,2]
            ]
        },
         { // Dificil (añade más aquí)
            puzzle: [
                [0,0,0,6,0,0,4,0,0], [7,0,0,0,0,3,6,0,0], [0,0,0,0,9,1,0,8,0],
                [0,0,0,0,0,0,0,0,0], [0,5,0,1,8,0,0,0,3], [0,0,0,3,0,6,0,4,5],
                [0,4,0,2,0,0,0,6,0], [9,0,3,0,0,0,0,1,0], [0,2,0,0,0,0,0,0,0]
            ],
            solucion: [
                [1,3,2,6,8,5,4,9,7], [7,9,8,4,2,3,6,5,1], [6,5,4,7,9,1,3,8,2],
                [4,6,9,8,5,7,1,2,3], [2,5,7,1,8,4,9,6,3], [8,1,3,3,2,6,7,4,5],
                [5,4,1,2,3,9,8,6,7], [9,8,3,5,7,4,2,1,6], [7,2,6,8,1,9,5,3,4]
            ]
        }
    ];
    puzzles = SUDOKU_DATA;

    // --- FUNCIONES ---

    function generarGrid() {
        sudokuContainer.innerHTML = '';
        resultadoSpan.textContent = '';
        puzzleActual.forEach((fila, indiceFila) => {
            const filaDiv = document.createElement('div');
            filaDiv.classList.add('sudoku-row');
            fila.forEach((valor, indiceCol) => {
                const celda = document.createElement('div');
                celda.classList.add('sudoku-cell');
                celda.dataset.row = indiceFila;
                celda.dataset.col = indiceCol;

                if (valor !== 0) {
                    celda.textContent = valor;
                    celda.classList.add('fixed'); // Celda fija, no se puede cambiar
                } else {
                    celda.addEventListener('click', () => seleccionarCelda(celda));
                }
                filaDiv.appendChild(celda);
            });
            sudokuContainer.appendChild(filaDiv);
        });
    }

    function seleccionarCelda(celda) {
        // Deseleccionar la anterior
        if (celdaSeleccionada) {
            celdaSeleccionada.classList.remove('selected');
        }
        // Seleccionar la nueva
        celdaSeleccionada = celda;
        celdaSeleccionada.classList.add('selected');
    }

    function escribirNumero(numero) {
        if (!celdaSeleccionada) return;

        // Borrar contenido
        if (numero === 'erase') {
            celdaSeleccionada.textContent = '';
            const { row, col } = celdaSeleccionada.dataset;
            puzzleActual[row][col] = 0; // Actualizar el modelo de datos
            return;
        }

        // Escribir número
        celdaSeleccionada.textContent = numero;
        const { row, col } = celdaSeleccionada.dataset;
        puzzleActual[row][col] = parseInt(numero, 10); // Actualizar el modelo de datos

        // Deseleccionar para evitar cambios accidentales
        celdaSeleccionada.classList.remove('selected');
        celdaSeleccionada = null;
    }

    function cargarPuzzle(index) {
        // Copia profunda para no modificar el puzzle original
        puzzleActual = puzzles[index].puzzle.map(fila => [...fila]);
        solucionActual = puzzles[index].solucion;
        generarGrid();
    }

    function corregirSudoku() {
        let esCorrecto = true;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (puzzleActual[i][j] !== solucionActual[i][j]) {
                    esCorrecto = false;
                    break;
                }
            }
            if (!esCorrecto) break;
        }
        
        if (esCorrecto) {
            resultadoSpan.textContent = '¡Correcto! 🎉';
            resultadoSpan.style.color = 'green';
        } else {
            resultadoSpan.textContent = 'Hay errores. ¡Sigue intentando!';
            resultadoSpan.style.color = 'red';
        }
    }

    // --- EVENT LISTENERS ---
    
    // Cambiar de puzzle
    selectorSudoku.addEventListener('change', (e) => {
        cargarPuzzle(e.target.value);
    });

    // Clic en el teclado numérico
    tecladoNumerico.addEventListener('click', (e) => {
        if (e.target.classList.contains('num')) {
            if (e.target.classList.contains('erase')) {
                escribirNumero('erase');
            } else {
                escribirNumero(e.target.textContent);
            }
        }
    });

    // Botón de corregir
    corregirBtn.addEventListener('click', corregirSudoku);


    // --- INICIALIZACIÓN ---
    cargarPuzzle(0); // Cargar el primer puzzle por defecto
});
