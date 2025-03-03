// filepath: /Users/isong/work/personal/pollen-count-poller/cmd/pollen-count/fetchContent.js
const puppeteer = require('puppeteer');

async function fetchContent(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.content();
  await browser.close();
  return content;
}

(async () => {
  const url = process.argv[2];
  const content = await fetchContent(url);
  console.log(content);
})();