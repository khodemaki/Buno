const ICON_NAMES = [
  'utensils', 'package', 'sun', 'moon', 'pencil', 'trash-2',
  'check', 'x', 'plus', 'shopping-cart', 'minus', 'printer'
];

window.ICONS = {};

async function preloadIcons() {
  await Promise.all(ICON_NAMES.map(async (name) => {
    try {
      const res = await fetch(`icons/${name}.svg`);
      window.ICONS[name] = await res.text();
    } catch (err) {
      console.error('آیکون لود نشد:', name, err);
      window.ICONS[name] = '';
    }
  }));
}

function icon(name) {
  return `<span class="icon">${window.ICONS[name] || ''}</span>`;
}