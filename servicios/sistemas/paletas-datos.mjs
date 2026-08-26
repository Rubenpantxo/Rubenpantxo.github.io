// Paletas de referencia del muestrario, agrupadas por tonalidad.
//
// Los colores de estos grupos estan transcritos de las capturas que aporto
// Ruben. Los marcados con revisar:true son los que en la imagen aparecen
// borrosos o sobre degradado y he tenido que interpretar.
//
// Las paletas de los sistemas ya no viven aqui: estan en sistemas-datos.mjs,
// que es la fuente unica del catalogo.

export const capturas = [
  { nombre: 'Piedra y pizarra', tono: 'neutro', colores: [
    ['Alabaster Grey', '#e5e4e2'], ['Onyx', '#0a0a0a'], ['Blue Slate', '#536878'] ] },
  { nombre: 'Brasa', tono: 'calido', colores: [
    ['Gold', '#ffd700'], ['Burgundy', '#800020'], ['Crimson Carrot', '#ff4500'] ] },
  { nombre: 'Neón ácido', tono: 'vivo', colores: [
    ['Chartreuse', '#ceff32'], ['Neon Pink', '#ec2b7a'], ['Pink Carnation', '#fe7bbf'] ] },
  { nombre: 'Violeta nocturno', tono: 'frio', colores: [
    ['Apricot Glow', '#ffdab9'], ['Obsidian Veil', '#0b130e'], ['Vivid Violet', '#9932cc'] ] },
  { nombre: 'Contraste eléctrico', tono: 'vivo', colores: [
    ['Antique White', '#f8e6d2'], ['Ultrasonic Blue', '#0c10e3'], ['Crimson Carrot', '#ff4500'] ] },
  { nombre: 'Nieve y fuego', tono: 'frio', colores: [
    ['Bright Snow', '#fafbfd'], ['Inferno', '#aa0003'], ['Periwinkle', '#bfb4dc'] ] },

  { nombre: 'Terracota y salvia', tono: 'calido', colores: [
    ['Burnt Peach', '#e07a5f'], ['Apricot Cream', '#f2ccbf'], ['Muted Teal', '#81b29a'],
    ['Eggshell', '#f4f1de'], ['Twilight Indigo', '#3d405b'] ] },
  { nombre: 'Arrecife', tono: 'frio', colores: [
    ['Abyss Teal', '#146bbc'], ['Shalow Reef', '#6ecbd3'], ['Sea Foam Bloom', '#9fe7e7'],
    ['Foam White', '#e8fbff'], ['Keel Black', '#0f1a1b'] ] },
  { nombre: 'Tierra y coral', tono: 'calido', colores: [
    ['Midnight Violet', '#31031f'], ['Light Coral', '#e88f93'], ['Dark Khaki', '#393313'],
    ['Floral White', '#fff8ed'], ['Olive Leaf', '#66693e'] ] },
  { nombre: 'Rescoldo', tono: 'calido', colores: [
    ['Brick Ember', '#d70005'], ['Cornsilk', '#fef8d6', true], ['Jasmine', '#fee87b'],
    ['Porcelain', '#f7faf6', true], ['Petal Frost', '#fcd9f7'] ] },
  { nombre: 'Lava y acero', tono: 'calido', colores: [
    ['Molten Lava', '#780000'], ['Brick Red', '#c1121f'], ['Steel Blue', '#669bbc'],
    ['Papaya Whip', '#fdf0d5'], ['Deep Space Blue', '#003049'] ] },
  { nombre: 'Alto contraste', tono: 'neutro', colores: [
    ['Black', '#000000'], ['Prussian Blue', '#14213d'], ['Orange', '#fca311'],
    ['White', '#ffffff'], ['Silver', '#c2c4c3'] ] },

  { nombre: 'Arena y lino', tono: 'neutro', colores: [
    ['Almond Silk', '#d5b0af', true], ['Dust Grey', '#d8ccc2'], ['Powder Petal', '#e3d5ca'],
    ['Linen', '#f5e8e0'], ['Parchment', '#edede9'] ] },
  { nombre: 'Chicle', tono: 'vivo', colores: [
    ['Bright Peony', '#ff93f3'], ['Bubblegum Fizz', '#ff7dd5'], ['Wild Strawberry', '#fe4e96'],
    ['Hot Fuchsia', '#fe2a65'], ['Lipstick Red', '#fd1042'] ] },
  { nombre: 'Agua helada', tono: 'frio', colores: [
    ['Frozen Water', '#d6f9f3'], ['Icy Aqua', '#acf2e7'], ['Pearl Aqua', '#83ecdc'],
    ['Turquoise', '#30dfc4'], ['Deep Turquoise', '#21c8af'] ] },
  { nombre: 'Café', tono: 'calido', colores: [
    ['Dark Coffee', '#36241c'], ['Coffee Brown', '#422c22'], ['Chocolate', '#4d3328'],
    ['Mauve Bark', '#644234'], ['Coffee Bean', '#815f51'] ] },
  { nombre: 'Grafito', tono: 'neutro', colores: [
    ['Carbon Black', '#212529'], ['Gunmetal', '#343a40'], ['Iron Grey', '#495057'],
    ['Slate Grey', '#6c757d'], ['Pale Slate', '#adb5bd'] ] },
  { nombre: 'Lavanda', tono: 'frio', colores: [
    ['Lavender Veil', '#ebe0ff'], ['Periwinkle', '#dac7ff'], ['Mauve', '#c7adff'],
    ['Soft Periwinkle', '#ac88ef'], ['Lavender Purple', '#916dd5'] ] },

  { nombre: 'Jade y noche', tono: 'frio', colores: [
    ['Jade Green', '#10c46d'], ['Dusk Blue', '#27488b'], ['Espresso', '#351309'] ] },
  { nombre: 'Rosa antiguo', tono: 'frio', colores: [
    ['Old Rose', '#cf98af'], ['Steel Azure', '#144ea0'], ['Carbon Black', '#1b1c20'] ] },
  { nombre: 'Bronce y caqui', tono: 'calido', colores: [
    ['Honey Bronze', '#dda84c'], ['Mauve Shadow', '#52313a'], ['Dark Khaki', '#3d3e14'] ] },
  { nombre: 'Oliva', tono: 'calido', colores: [
    ['Floral White', '#fff8ed'], ['Olive Leaf', '#66693e'], ['Midnight Violet', '#31031f'] ] },
  { nombre: 'Lino y frambuesa', tono: 'calido', colores: [
    ['Linen', '#faf1e8'], ['Bubblegum Pink', '#ea6b7e'], ['Rich Mahogany', '#4c1413'] ] },
  { nombre: 'Almendra y ciruela', tono: 'calido', colores: [
    ['Almond Light', '#ebd3bb'], ['Plum Wine', '#49252f'], ['Carbon Power', '#101211'] ] }
];
