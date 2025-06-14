document.addEventListener('DOMContentLoaded', ()=>{
  const sudokuContainer = document.getElementById('sudokuContainer');
  const listaSudokus = document.getElementById('listaSudokus');
  const teclado = document.getElementById('tecladoNumerico');
  const selectorSudoku = document.getElementById('selectorSudoku');
  let sudokuActual, solucionActual;

  // Genera selector de niveles
  for(let i=0; i<100; i++){
    const opcion = document.createElement('option');
    opcion.value = i;
    opcion.textContent = `Sudoku #${i+1} (${i<40?'Fácil':i<80?'Medio':'Difícil'})`;
    selectorSudoku.appendChild(opcion);
  }

  selectorSudoku.addEventListener('change', cargarSudoku);

  function cargarSudoku(){
    fetch(`sudokus/${selectorSudoku.value}.json`)
    .then(res=>res.json())
    .then(tablero=>{
      solucionActual = tablero;
      sudokuContainer.innerHTML = '';
      sudokuActual = [];

      // Crear tablero HTML
      for(let i=0; i<9; i++){
        sudokuActual[i] = [];
        const fila = document.createElement('div');
        fila.style.display = 'flex';
        for(let j=0; j<9; j++){
          const celda = document.createElement('div');
          celda.textContent = tablero[i][j] || '';
          celda.style.cssText = 'border:1px solid #aaa;width:30px;height:30px;text-align:center;font-family:"Comic Sans MS",cursive;font-size:18px;';
          celda.dataset.x = i; celda.dataset.y = j;

          if(!tablero[i][j]){
            celda.classList.add('editable');
            celda.onclick = ()=>seleccionarCelda(celda);
          }else{
            celda.style.fontWeight = 'bold';
          }
          fila.appendChild(celda);
          sudokuActual[i][j] = celda;
        }
        sudokuContainer.appendChild(fila);
      }
    });
  }

  // Selección de celda para rellenar
  let celdaActiva = null;
  function seleccionarCelda(celda){
    if(celdaActiva) celdaActiva.style.background = '';
    celdaActiva = celda;
    celda.style.background = '#ddd';
  }

  teclado.addEventListener('click', e=>{
    if(e.target.classList.contains('num') && celdaActiva){
      celdaActiva.textContent = e.target.textContent;
      celdaActiva.style.color = '#007';
    }
  });

  // Corregir el sudoku
  document.getElementById('corregirSudoku').onclick = ()=>{
    if(!solucionActual) return;
    sudokuActual.flat().forEach(celda=>{
      if(celda.classList.contains('editable')){
        const x = celda.dataset.x, y = celda.dataset.y;
        if(parseInt(celda.textContent) !== solucionActual[x][y]){
          celda.textContent = '';
        }
      }
    });
  };
});
