const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const moment = require('jalali-moment');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

let dataPath;

function ensureDataFile() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  const userPath = path.join(dataDir, 'store.json');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(userPath)) {
    const bundledPath = path.join(__dirname, 'data', 'store.json');
    if (fs.existsSync(bundledPath)) {
      fs.copyFileSync(bundledPath, userPath);
    } else {
      fs.writeFileSync(userPath, JSON.stringify({
        settings: {
          restaurantName: 'نام رستوران', address: '', phone: '', logoData: '',
          footerMessage: 'با تشکر از خرید شما', taxPercent: 0, paperWidth: 80,
          theme: 'light', receiptTemplate: 'classic'
        },
        categories: [], products: [], orderCounter: 0
      }, null, 2), 'utf-8');
    }
  }

  return userPath;
}

const PRINTER_SHARE_NAME = 'POS80';

function readData() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

function fileToDataUrl(relativePath) {
  try {
    const fullPath = path.join(__dirname, relativePath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const buffer = fs.readFileSync(fullPath);
    return `data:image/${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('خطا در خواندن عکس:', relativePath, err.message);
    return null;
  }
}

function createSplash() {
  const splash = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    center: true,
    show: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splash.loadFile('splash.html');

  splash.webContents.once('did-finish-load', () => {
    splash.webContents.send('splash-images', {
      logo: fileToDataUrl('assets/logo.png'),
      bg: fileToDataUrl('assets/splash-bg.jpeg')
    });
  });

  return splash;
}

function createWindow(splash) {
  const win = new BrowserWindow({
    width: 1300,
    height: 850,
    show: false, // تا وقتی کامل آماده نشده نشونش نمی‌دیم
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    setTimeout(() => {
      if (splash) splash.close();
      win.show();
    }, 3000); 
  });

  return win;
}

app.whenReady().then(() => {
  dataPath = ensureDataFile();

  const splash = createSplash();
  createWindow(splash);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(null);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-data', () => readData());
ipcMain.handle('save-data', (event, newData) => {
  writeData(newData);
  return true;
});

const RECEIPT_WIDTH_PX = 576; 

function waitWithTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`مرحله «${label}» بیش از حد طول کشید.`)), ms)
    )
  ]);
}

async function renderReceiptToPngFile(fullOrder, type) {
  const win = new BrowserWindow({
    width: RECEIPT_WIDTH_PX,
    height: 600,
    x: -2000,
    y: 0,
    show: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'receipt-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  try {
    await waitWithTimeout(win.loadFile('receipt.html'), 8000, 'بارگذاری قالب فیش');

    await waitWithTimeout(new Promise((resolve) => {
      ipcMain.once('content-ready', resolve);
      win.webContents.send('receipt-data', { ...fullOrder, type });
    }), 10000, `آماده‌سازی محتوای فیش (${type === 'kitchen' ? 'آشپزخانه' : 'مشتری'})`);

    const heightPx = await waitWithTimeout(
      win.webContents.executeJavaScript(`document.getElementById('receipt').scrollHeight`),
      5000,
      'اندازه‌گیری ارتفاع فیش'
    );

    win.setContentSize(RECEIPT_WIDTH_PX, Math.max(200, Math.ceil(heightPx)));
    await new Promise((r) => setTimeout(r, 150));

    const image = await waitWithTimeout(win.webContents.capturePage(), 8000, 'گرفتن عکس از فیش');

    const pngPath = path.join(os.tmpdir(), `receipt-${type}-${Date.now()}.png`);
    fs.writeFileSync(pngPath, image.toPNG());

    return pngPath;
  } finally {
    win.destroy();
  }
}

async function printImageRaw(pngPath) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'tcp://127.0.0.1:9100',
    width: 48
  });

  await printer.printImage(pngPath);
  printer.cut();

  const buffer = printer.getBuffer();
  const binPath = path.join(os.tmpdir(), `escpos-${Date.now()}.bin`);
  fs.writeFileSync(binPath, buffer);

  await waitWithTimeout(new Promise((resolve, reject) => {
    const cmd = `copy /b "${binPath}" "\\\\localhost\\${PRINTER_SHARE_NAME}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(
          `ارسال به پرینتر ناموفق بود. مطمئن شوید پرینتر با اسم «${PRINTER_SHARE_NAME}» به‌اشتراک گذاشته شده. جزئیات: ${stderr || error.message}`
        ));
      } else {
        resolve();
      }
    });
  }), 15000, 'ارسال بایت‌های خام به پرینتر');

  fs.unlink(binPath, () => {});
  fs.unlink(pngPath, () => {});
}

ipcMain.handle('print-receipt', async (event, orderData) => {
  const data = readData();
  data.orderCounter = (data.orderCounter || 0) + 1;
  const orderNumber = data.orderCounter;
  writeData(data);

  const fullOrder = {
    ...orderData,
    orderNumber,
    settings: data.settings,
    template: data.settings.receiptTemplate || 'classic',
    jalaliDate: moment().locale('fa').format('jYYYY/jMM/jDD'),
    time: moment().format('HH:mm')
  };

  const customerPng = await renderReceiptToPngFile(fullOrder, 'customer');
  await printImageRaw(customerPng);

  const kitchenPng = await renderReceiptToPngFile(fullOrder, 'kitchen');
  await printImageRaw(kitchenPng);

  return orderNumber;
});
