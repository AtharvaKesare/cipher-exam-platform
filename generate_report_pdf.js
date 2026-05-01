const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, 'EDI_Report_Part1.html');
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });
  await page.pdf({ path: path.resolve(__dirname, 'Cipher_EDI_Report.pdf'), format: 'A4', printBackground: true, margin: { top: '1in', right: '0.5in', bottom: '1in', left: '1.5in' } });
  await browser.close();
  console.log('PDF generated at', path.resolve(__dirname, 'Cipher_EDI_Report.pdf'));
})();
