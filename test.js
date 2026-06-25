import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE RUNTIME ERROR:', err.message);
  });

  try {
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch(e) {
    console.log("Goto error:", e.message);
  }

  try {
    await page.goto('http://localhost:5173/staff', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch(e) {
    console.log("Goto error:", e.message);
  }

  await browser.close();
  console.log("Done");
})();
