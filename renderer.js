let appData = null;
let selectedCategoryId = null;
let editingCategoryId = null;
let editingProductId = null;

let posSelectedCategoryId = null;
let cart = []; // { productId, name, price, qty }
let isTakeaway = false;

Promise.all([preloadIcons(), window.api.loadData()]).then(([_, data]) => {
  appData = data;
  applyTheme(appData.settings.theme || 'light');
  renderStaticIcons();
  renderCategories();
  renderPosCategories();
});

function persist() {
  window.api.saveData(appData);
}

/* ===== آیکون‌های ثابت صفحه ===== */
function renderStaticIcons() {
  document.getElementById('brand-icon').innerHTML = icon('utensils');
  document.getElementById('manage-btn-icon').innerHTML = icon('package');
  document.getElementById('sun-icon').innerHTML = icon('sun');
  document.getElementById('moon-icon').innerHTML = icon('moon');
  document.getElementById('print-btn-icon').innerHTML = icon('printer');
  document.getElementById('settings-open-btn').querySelector('svg') || (document.getElementById('settings-open-btn').innerHTML = icon('settings') + ' تنظیمات فیش');

  document.querySelectorAll('[data-icon-name]').forEach(el => {
    el.innerHTML = icon(el.dataset.iconName);
  });
}

/* ===== تم ===== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').checked = theme === 'dark';
}

document.getElementById('theme-toggle').addEventListener('change', (e) => {
  const theme = e.target.checked ? 'dark' : 'light';
  applyTheme(theme);
  appData.settings.theme = theme;
  persist();
});

/* ===== باز/بسته کردن مودال ===== */
const modal = document.getElementById('manage-modal');
document.getElementById('manage-open-btn').addEventListener('click', () => modal.classList.add('open'));
document.getElementById('manage-close-btn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('open');
  editingCategoryId = null;
  editingProductId = null;
  renderPosCategories();
  renderPosProducts();
}

/* ===== کتگوری‌ها (مدیریت) ===== */
function renderCategories() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';

  if (appData.categories.length === 0) {
    list.innerHTML = '<p class="hint-text">هنوز کتگوری‌ای اضافه نشده</p>';
  }

  appData.categories.forEach(cat => {
    const row = document.createElement('div');

    if (editingCategoryId === cat.id) {
      row.className = 'item-row';
      row.innerHTML = `
        <form class="edit-row">
          <input type="text" value="${cat.name}" id="edit-cat-input">
          <button type="submit" class="btn-icon" data-icon-name="check"></button>
          <button type="button" class="btn-icon" id="cancel-edit-cat" data-icon-name="x"></button>
        </form>`;
      row.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('edit-cat-input').value.trim();
        if (val) { cat.name = val; persist(); }
        editingCategoryId = null;
        renderCategories();
        renderPosCategories();
      });
      row.querySelector('#cancel-edit-cat').addEventListener('click', () => {
        editingCategoryId = null;
        renderCategories();
      });
      renderStaticIcons();
    } else {
      row.className = 'item-row' + (cat.id === selectedCategoryId ? ' selected' : '');
      row.innerHTML = `
        <span class="item-title">${cat.name}</span>
        <span class="item-actions">
          <button data-edit data-icon-name="pencil"></button>
          <button data-delete data-icon-name="trash-2"></button>
        </span>`;

      row.addEventListener('click', () => selectCategory(cat.id));
      row.querySelector('[data-edit]').addEventListener('click', (e) => {
        e.stopPropagation();
        editingCategoryId = cat.id;
        renderCategories();
      });
      row.querySelector('[data-delete]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`کتگوری «${cat.name}» و همه محصولاتش حذف بشه؟`)) {
          appData.categories = appData.categories.filter(c => c.id !== cat.id);
          appData.products = appData.products.filter(p => p.categoryId !== cat.id);
          if (selectedCategoryId === cat.id) selectedCategoryId = null;
          persist();
          renderCategories();
          renderProducts();
        }
      });
       }

    list.appendChild(row);
  });

  renderStaticIcons();
}

function selectCategory(id) {
  selectedCategoryId = id;
  editingProductId = null;
  const cat = appData.categories.find(c => c.id === id);
  document.getElementById('product-panel-title').textContent = 'محصولات — ' + cat.name;
  document.getElementById('product-add-form').classList.remove('hidden');
  document.getElementById('product-empty-hint').classList.add('hidden');
  renderCategories();
  renderProducts();
}

document.getElementById('category-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('new-category-name');
  const name = input.value.trim();
  if (!name) return;
  appData.categories.push({ id: crypto.randomUUID(), name });
  input.value = '';
  persist();
  renderCategories();
  renderPosCategories();
});

/* ===== محصولات (مدیریت) ===== */
function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';

  if (!selectedCategoryId) return;

  const products = appData.products.filter(p => p.categoryId === selectedCategoryId);

  if (products.length === 0) {
    list.innerHTML = '<p class="hint-text">محصولی در این کتگوری نیست</p>';
  }

  products.forEach(prod => {
    const row = document.createElement('div');

    if (editingProductId === prod.id) {
      row.className = 'item-row';
      row.innerHTML = `
        <form class="edit-row">
          <input type="text" value="${prod.name}" id="edit-prod-name">
          <input type="number" value="${prod.price}" id="edit-prod-price" style="max-width:100px;">
          <button type="submit" class="btn-icon" data-icon-name="check"></button>
          <button type="button" class="btn-icon" id="cancel-edit-prod" data-icon-name="x"></button>
        </form>`;
      row.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-prod-name').value.trim();
        const price = parseInt(document.getElementById('edit-prod-price').value);
        if (name) prod.name = name;
        if (!isNaN(price)) prod.price = price;
        persist();
        editingProductId = null;
        renderProducts();
        renderPosProducts();
      });
      row.querySelector('#cancel-edit-prod').addEventListener('click', () => {
        editingProductId = null;
        renderProducts();
      });
      renderStaticIcons();
    } else {
      row.className = 'item-row';
      row.innerHTML = `
        <span>
          <span class="item-title">${prod.name}</span><br>
          <span class="item-sub">${prod.price.toLocaleString()} تومان</span>
        </span>
        <span class="item-actions">
          <button data-edit data-icon-name="pencil"></button>
          <button data-delete data-icon-name="trash-2"></button>
        </span>`;
      row.querySelector('[data-edit]').addEventListener('click', () => {
        editingProductId = prod.id;
        renderProducts();
      });
      row.querySelector('[data-delete]').addEventListener('click', () => {
        if (confirm(`محصول «${prod.name}» حذف بشه؟`)) {
          appData.products = appData.products.filter(p => p.id !== prod.id);
          persist();
          renderProducts();
          renderPosProducts();
        }
      });
       }

    list.appendChild(row);
  });

  renderStaticIcons();
}

document.getElementById('product-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!selectedCategoryId) return;
  const nameInput = document.getElementById('new-product-name');
  const priceInput = document.getElementById('new-product-price');
  const name = nameInput.value.trim();
  const price = parseInt(priceInput.value);
  if (!name || isNaN(price)) return;

  appData.products.push({ id: crypto.randomUUID(), categoryId: selectedCategoryId, name, price });

  nameInput.value = '';
  priceInput.value = '';
  persist();
  renderProducts();
  renderPosProducts();
});

/* ================= صفحه فروش (POS) ================= */

function renderPosCategories() {
  const bar = document.getElementById('pos-category-bar');
  bar.innerHTML = '';

  if (!appData) return;

  if (appData.categories.length === 0) {
    bar.innerHTML = '<p class="hint-text"></p>';
    return;
  }

  if (!posSelectedCategoryId || !appData.categories.find(c => c.id === posSelectedCategoryId)) {
    posSelectedCategoryId = appData.categories[0].id;
  }

  appData.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pos-cat-btn' + (cat.id === posSelectedCategoryId ? ' active' : '');
    btn.textContent = cat.name;
    btn.addEventListener('click', () => {
      posSelectedCategoryId = cat.id;
      renderPosCategories();
      renderPosProducts();
    });
    bar.appendChild(btn);
  });

  renderPosProducts();
}

function renderPosProducts() {
  const grid = document.getElementById('pos-product-grid');
  grid.innerHTML = '';

  if (!appData || !posSelectedCategoryId) return;

  const products = appData.products.filter(p => p.categoryId === posSelectedCategoryId);

  if (products.length === 0) {
    grid.innerHTML = '<p class="hint-text">محصولی در این کتگوری نیست</p>';
    return;
  }

  products.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="p-name">${prod.name}</div>
      <div class="p-price">${prod.price.toLocaleString()} تومان</div>
    `;
    card.addEventListener('click', () => addToCart(prod));
    grid.appendChild(card);
  });
}

/* ===== سبد سفارش ===== */
function addToCart(prod) {
  const existing = cart.find(i => i.productId === prod.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ productId: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  renderCart();
}

function changeCartQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  }
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-list');
  list.innerHTML = '';

  if (cart.length === 0) {
    list.innerHTML = '<p class="hint-text">سبد سفارش خالیه</p>';
  }

  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-top">
        <span class="cart-item-name">${item.name}</span>
        <button class="cart-item-remove" data-remove>حذف</button>
      </div>
      <div class="cart-item-row">
        <div class="qty-controls">
          <button class="qty-btn" data-minus>${icon('minus')}</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-plus>${icon('plus')}</button>
        </div>
        <span>${(item.price * item.qty).toLocaleString()} تومان</span>
      </div>
    `;
    div.querySelector('[data-plus]').addEventListener('click', () => changeCartQty(item.productId, 1));
    div.querySelector('[data-minus]').addEventListener('click', () => changeCartQty(item.productId, -1));
    div.querySelector('[data-remove]').addEventListener('click', () => removeFromCart(item.productId));
    list.appendChild(div);
  });

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById('cart-total').textContent = total.toLocaleString() + ' تومان';
}

document.getElementById('takeaway-toggle').addEventListener('change', (e) => {
  isTakeaway = e.target.checked;
});

document.getElementById('register-order-btn').addEventListener('click', async () => {
  if (cart.length === 0) {
    alert('سبد سفارش خالیه!');
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const orderData = {
    items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal,
    isTakeaway
  };

  const btn = document.getElementById('register-order-btn');
  btn.disabled = true;
  btn.textContent = 'در حال چاپ...';

  try {
    await window.api.printReceipt(orderData);
  } catch (err) {
    console.error(err);
    alert('خطا پرینتر');
  }

  btn.disabled = false;
  btn.innerHTML = icon('printer') + ' ثبت و صدور فیش';

  cart = [];
  isTakeaway = false;
  document.getElementById('takeaway-toggle').checked = false;
  renderCart();
});

/* ===== مودال تنظیمات ===== */const settingsModal = document.getElementById('settings-modal');

document.getElementById('settings-open-btn').addEventListener('click', () => {
  const s = appData.settings;
  document.getElementById('setting-template').value = s.receiptTemplate || 'classic';
  document.getElementById('setting-name').value = s.restaurantName || '';
  document.getElementById('setting-address').value = s.address || '';
  document.getElementById('setting-phone').value = s.phone || '';
  document.getElementById('setting-footer').value = s.footerMessage || '';
  document.getElementById('setting-tax').value = s.taxPercent || 0;

  const preview = document.getElementById('logo-preview');
  if (s.logoData) {
    preview.src = s.logoData;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }

  settingsModal.classList.add('open');
});

document.getElementById('settings-close-btn').addEventListener('click', () => {
  settingsModal.classList.remove('open');
});
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.remove('open');
});

document.getElementById('logo-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    appData.settings.logoData = reader.result;
    const preview = document.getElementById('logo-preview');
    preview.src = reader.result;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  appData.settings.receiptTemplate = document.getElementById('setting-template').value;
  appData.settings.restaurantName = document.getElementById('setting-name').value.trim();
  appData.settings.address = document.getElementById('setting-address').value.trim();
  appData.settings.phone = document.getElementById('setting-phone').value.trim();
  appData.settings.footerMessage = document.getElementById('setting-footer').value.trim();
  appData.settings.taxPercent = parseInt(document.getElementById('setting-tax').value) || 0;
  persist();
  settingsModal.classList.remove('open');
});

/* ===== اتصال چاپ واقعی به دکمه ثبت سفارش ===== */
document.getElementById('register-order-btn').removeEventListener; // 