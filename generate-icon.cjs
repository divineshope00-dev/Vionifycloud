const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800&display=swap');
          body {
            margin: 0;
            padding: 0;
            width: 512px;
            height: 512px;
            background-color: #a855f7;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', sans-serif;
          }
          h1 {
            color: white;
            font-size: 100px;
            font-weight: 800;
            letter-spacing: -2px;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <h1>Vionify</h1>
      </body>
    </html>
  `;
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'public/apple-touch-icon.png' });
  await browser.close();
})();
