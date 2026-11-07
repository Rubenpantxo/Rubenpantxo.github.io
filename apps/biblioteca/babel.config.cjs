// Compila biblioteca.jsx → biblioteca.js (npm run biblioteca).
// JSX clásico (React.createElement) porque React se carga como script global,
// y sin comentarios salvo la cabecera /*! … */ que avisa de que es generado.
module.exports = {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    shouldPrintComment: c => c.startsWith('!')
};
