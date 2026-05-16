/* ===================================================
 * STOCK - Inventario, lista compra, tiendas
 * =================================================== */
const Stock = (() => {

  function render() {
    const container = document.getElementById('section-container');
    const stock = Storage.get('stock') || [];
    const listaCompra = Storage.get('lista_compra') || [];
    const tiendas = Storage.get('tiendas') || [];
    const bancos = Storage.get('bancos_semillas') || [];

    container.innerHTML = `
      <section class="section theme-stock">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/stock.png" alt=""></div>
            <div>
              <h1 class="section-title">Stock y Tienda</h1>
              <p class="section-subtitle">${stock.length} productos en inventario · ${listaCompra.length} en lista de compra</p>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
            <button class="btn" onclick="Stock.openProductForm()">＋ Producto</button>
          </div>
        </div>

        <div class="stock-grid">
          <div class="stock-section">
            <h3><img src="assets/icons/substratos-fertilizantes.png" alt="" style="width:28px;"> Inventario de productos</h3>
            ${stock.length === 0 ? `
              <div class="empty-state">
                <img src="assets/icons/no-tienda.png" alt="">
                <h3>Sin productos</h3>
                <p>Añade tu primer producto al inventario</p>
              </div>
            ` : stock.map(renderProductRow).join('')}
          </div>

          <div class="stock-section">
            <h3><img src="assets/icons/semillas.png" alt="" style="width:28px;"> Lista de compra</h3>
            ${listaCompra.length === 0
              ? '<p style="color:var(--text-soft);font-size:13px;font-style:italic;">No tienes nada apuntado.</p>'
              : listaCompra.map(item => `
                <div class="shopping-list-item">
                  <span>${escapeHtml(item.producto)} <small style="color:var(--text-soft);">${item.prioridad || ''}</small></span>
                  <button class="btn btn-sm btn-ghost" onclick="Stock.removeShopping('${item.id}')">✓</button>
                </div>
              `).join('')
            }
            <button class="btn btn-sm btn-ghost" style="margin-top:10px;width:100%;" onclick="Stock.openShoppingForm()">＋ Añadir a la lista</button>

            <h3 style="margin-top:24px;"><img src="assets/icons/tienda.png" alt="" style="width:28px;"> Tiendas (growshops)</h3>
            <ul class="shop-list">
              ${tiendas.map(t => `<li>${escapeHtml(t.nombre)}</li>`).join('')}
            </ul>

            <h3 style="margin-top:24px;"><img src="assets/icons/semillas.png" alt="" style="width:28px;"> Bancos de semillas</h3>
            <ul class="shop-list">
              ${bancos.map(b => `<li>${escapeHtml(b.nombre)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  function renderProductRow(p) {
    const qty = p.cantidad_ml ? `${p.cantidad_ml} ml` : (p.cantidad_g ? `${p.cantidad_g} g` : '—');
    return `
      <div class="product-row">
        <img src="assets/icons/aditivos-riego.png" alt="">
        <div>
          <div class="product-name">${escapeHtml(p.nombre)}</div>
          <div class="product-brand">${escapeHtml(p.marca)} · ${escapeHtml(p.categoria || '')}</div>
        </div>
        <div class="product-dose">${escapeHtml(p.dosis || '')}</div>
        <div class="product-qty">${qty}</div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm btn-ghost" onclick="Stock.openProductForm('${p.id}')">✎</button>
          <button class="btn btn-sm btn-danger" onclick="Stock.removeProduct('${p.id}')">🗑</button>
        </div>
      </div>
    `;
  }

  function openProductForm(id = null) {
    const p = id ? Storage.listFind('stock', id) : {
      nombre: '', marca: 'Top Crop', categoria: 'fertilizante-base', cantidad_ml: 0, dosis: ''
    };
    Modal.open(`
      <h2 class="modal-title">${id ? '✎ Editar producto' : '＋ Nuevo producto'}</h2>
      <form id="product-form">
        <div class="form-row">
          <label>Nombre del producto</label>
          <input name="nombre" value="${escapeHtml(p.nombre)}" required>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Marca</label>
            <input name="marca" value="${escapeHtml(p.marca || '')}" required>
          </div>
          <div class="form-row">
            <label>Categoría</label>
            <select name="categoria">
              ${['enraizante','fertilizante-base','estimulador','floracion','engorde','biologico','sustrato','semillas','accesorio'].map(c =>
                `<option value="${c}" ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Cantidad (ml)</label>
            <input type="number" name="cantidad_ml" value="${p.cantidad_ml || 0}" min="0">
          </div>
          <div class="form-row">
            <label>Cantidad (g)</label>
            <input type="number" name="cantidad_g" value="${p.cantidad_g || 0}" min="0">
          </div>
        </div>
        <div class="form-row">
          <label>Dosis recomendada (ej: 0,5-1 ml/L)</label>
          <input name="dosis" value="${escapeHtml(p.dosis || '')}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
          <button type="submit" class="btn">${id ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    `);

    document.getElementById('product-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.cantidad_ml = parseInt(data.cantidad_ml) || 0;
      data.cantidad_g = parseInt(data.cantidad_g) || 0;
      if (id) {
        Storage.listUpdate('stock', id, data);
        Toast.show('Producto actualizado', 'success');
      } else {
        Storage.listAdd('stock', data);
        Toast.show('Producto añadido al stock', 'success');
      }
      Modal.close();
      render();
    });
  }

  function removeProduct(id) {
    if (!confirm('¿Eliminar este producto del stock?')) return;
    Storage.listRemove('stock', id);
    Toast.show('Producto eliminado', 'success');
    render();
  }

  function openShoppingForm() {
    Modal.open(`
      <h2 class="modal-title">＋ Añadir a la lista de compra</h2>
      <form id="shopping-form">
        <div class="form-row">
          <label>Producto</label>
          <input name="producto" required>
        </div>
        <div class="form-row">
          <label>Prioridad</label>
          <select name="prioridad">
            <option value="baja">Baja</option>
            <option value="media" selected>Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
        <div class="form-row">
          <label>Notas</label>
          <input name="notas">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
          <button type="submit" class="btn">Añadir</button>
        </div>
      </form>
    `);
    document.getElementById('shopping-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Storage.listAdd('lista_compra', data);
      Toast.show('Añadido a la lista de compra', 'success');
      Modal.close();
      render();
    });
  }

  function removeShopping(id) {
    Storage.listRemove('lista_compra', id);
    render();
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, openProductForm, removeProduct, openShoppingForm, removeShopping };
})();
