// test para la unidad de medida VH de CSS
// escrito por BCasal

(function() {
	if (!Modernizr.cssvhunit) {
		alert('Este navegador «NO» soporta VH');
	} else {
		alert('Este navegador «SI» soporta VH');
	}
}).call(this);
