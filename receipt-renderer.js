window.receiptApi.onData(async (order) => {
  const s = order.settings;
  const root = document.getElementById('receipt');
  const isCreative = order.template === 'creative';

  if (order.type === 'kitchen') {
    root.innerHTML = isCreative ? buildKitchenHtmlCreative(order, s) : buildKitchenHtml(order, s);
  } else {
    root.innerHTML = isCreative ? buildCustomerHtmlCreative(order, s) : buildCustomerHtml(order, s);
  }

  await document.fonts.ready;
  await waitForImages();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.receiptApi.notifyContentReady();
    });
  });
});

function waitForImages() {
  const imgs = document.querySelectorAll('img');
  return Promise.all(Array.from(imgs).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
  }));
}

function buildCustomerHtml(order, s) {
  const taxAmount = Math.round(order.subtotal * (s.taxPercent || 0) / 100);
  const grandTotal = order.subtotal + taxAmount;

  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <tr>
        <td class="name">${item.name}</td>
        <td class="num">${item.qty}</td>
        <td class="price">${(item.price * item.qty).toLocaleString()}</td>
      </tr>`;
  });

  return `
    ${s.logoData ? `<img class="logo" src="${s.logoData}">` : ''}
    <div class="center">
      <div class="r-name">${s.restaurantName || ''}</div>
      ${s.address ? `<div class="r-info">${s.address}</div>` : ''}
      ${s.phone ? `<div class="r-info">${s.phone}</div>` : ''}
    </div>
    <div class="divider solid"></div>
    <div class="meta-row"><span>شماره فیش</span><span>#${order.orderNumber}</span></div>
    <div class="meta-row"><span>تاریخ</span><span>${order.jalaliDate}</span></div>
    <div class="meta-row"><span>ساعت</span><span>${order.time}</span></div>
    ${order.isTakeaway ? `<div class="center"><span class="takeaway-badge">بیرون‌بر</span></div>` : ''}
    <div class="divider"></div>
    <table>
      <thead><tr><th>شرح</th><th class="num">تعداد</th><th class="price">مبلغ</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>جمع جزء</span><span>${order.subtotal.toLocaleString()} تومان</span></div>
      ${s.taxPercent ? `<div class="totals-row"><span>مالیات و عوارض (${s.taxPercent}%)</span><span>${taxAmount.toLocaleString()} تومان</span></div>` : ''}
      <div class="totals-row grand-total"><span>مبلغ قابل پرداخت</span><span>${grandTotal.toLocaleString()} تومان</span></div>
    </div>
    <div class="footer">
      <div>${s.footerMessage || ''}</div>
    </div>
  `;
}

function buildKitchenHtml(order, s) {
  const taxAmount = Math.round(order.subtotal * (s.taxPercent || 0) / 100);
  const grandTotal = order.subtotal + taxAmount;

  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div class="kitchen-item">
        <span>${item.name}</span>
        <span class="k-qty">×${item.qty}</span>
      </div>`;
  });

  return `
    <div class="kitchen-title">فیش فروشنده</div>
    <div class="kitchen-meta">سفارش #${order.orderNumber} — ساعت ${order.time}</div>
    ${order.isTakeaway ? `<div class="center"><span class="takeaway-badge">بیرون‌بر</span></div>` : ''}
    <div class="divider solid"></div>
    ${itemsHtml}
    <div class="divider solid"></div>
    <div class="kitchen-total">
      <span>مبلغ قابل پرداخت</span>
      <span>${grandTotal.toLocaleString()} تومان</span>
    </div>
  `;
}

/* ===================== قالب دو ===================== */

function buildCustomerHtmlCreative(order, s) {
  const taxAmount = Math.round(order.subtotal * (s.taxPercent || 0) / 100);
  const grandTotal = order.subtotal + taxAmount;

  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div class="c-item-row">
        <div class="c-item-left">
          <div class="c-qty-circle">${item.qty}</div>
          <div class="c-item-name">${item.name}</div>
        </div>
        <div class="c-item-price">${(item.price * item.qty).toLocaleString()}</div>
      </div>`;
  });

  return `
    ${s.logoData ? `<img class="logo" src="${s.logoData}">` : `<div class="c-slice"></div>`}
    <div class="c-name">${s.restaurantName || ''}</div>
    <div class="c-tagline">FAST FOOD & PIZZA</div>
    ${s.address ? `<div class="c-info">${s.address}</div>` : ''}
    ${s.phone ? `<div class="c-info">${s.phone}</div>` : ''}

    <div class="c-dotline">• • • • • • • • • • • • • • •</div>

    <div class="c-meta-box">
      <div class="c-meta-row"><span>شماره سفارش</span><b>#${order.orderNumber}</b></div>
      <div class="c-meta-row"><span>تاریخ</span><b>${order.jalaliDate}</b></div>
      <div class="c-meta-row"><span>ساعت</span><b>${order.time}</b></div>
    </div>

    ${order.isTakeaway ? `<div class="center"><span class="takeaway-badge">بیرون‌بر</span></div>` : ''}

    <div class="c-section-label">سفارش شما</div>
    ${itemsHtml}

    <div class="c-totals">
      <div class="c-totals-row"><span>جمع جزء</span><span>${order.subtotal.toLocaleString()} تومان</span></div>
      ${s.taxPercent ? `<div class="c-totals-row"><span>مالیات و عوارض (${s.taxPercent}%)</span><span>${taxAmount.toLocaleString()} تومان</span></div>` : ''}
    </div>

    <div class="c-grand-box">
      <span class="label">مبلغ قابل پرداخت</span>
      <span class="amount">${grandTotal.toLocaleString()}</span>
    </div>

    <div class="c-footer">
      <div class="stars">★ ★ ★ ★ ★</div>
      <div class="msg">${s.footerMessage || 'نوش جان!'}</div>
      <div class="sub">منتظر سفارش بعدی شما هستیم</div>
    </div>
  `;
}

function buildKitchenHtmlCreative(order, s) {
  const taxAmount = Math.round(order.subtotal * (s.taxPercent || 0) / 100);
  const grandTotal = order.subtotal + taxAmount;

  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div class="c-item-row">
        <div class="c-item-left">
          <div class="c-qty-circle" style="width:48px;height:48px;font-size:24px;">${item.qty}</div>
          <div class="c-item-name" style="font-size:30px;">${item.name}</div>
        </div>
      </div>`;
  });

  return `
    <div class="c-slice"></div>
    <div class="kitchen-title">فیش فروشنده</div>
    <div class="c-meta-box">
      <div class="c-meta-row"><span>سفارش</span><b>#${order.orderNumber}</b></div>
      <div class="c-meta-row"><span>ساعت</span><b>${order.time}</b></div>
    </div>
    ${order.isTakeaway ? `<div class="center"><span class="takeaway-badge">بیرون‌بر</span></div>` : ''}
    <div class="c-section-label">اقلام</div>
    ${itemsHtml}
    <div class="c-grand-box">
      <span class="label">مبلغ قابل پرداخت</span>
      <span class="amount">${grandTotal.toLocaleString()}</span>
    </div>
  `;
}