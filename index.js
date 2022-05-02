const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const datas = require('./data');
const utils = require('./utils');

const templateCompiled = _.template(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        html, body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #fff;
        }
        img {
          max-width: 80%;
        }
      </style>
    </head>
    <body>
      <img src="data:img/png;base64,<%= base64 %>">
    </body>
  </html>
`);

async function execute() {
  const outputPath = path.resolve(__dirname, './output');
  const outputPathImage = path.resolve(outputPath, 'image');
  const outputPathPdf = path.resolve(outputPath, 'pdf');

  await fs.promises.mkdir(outputPathImage, { recursive: true });
  await fs.promises.mkdir(outputPathPdf, { recursive: true });

  console.log('启动中...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      /* '--start-fullscreen',  */
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--user-data-dir',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses',
    ],
  });
  const [page, pdfPage] = await Promise.all([browser.newPage(), browser.newPage()]);

  await Promise.all([
    page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36',
    ),
    page.setJavaScriptEnabled(true),
    page.setCookie(...datas.cookieArray),
  ]);

  await page.goto('https://juejin.cn/book/6946117847848321055/section/6956174385904353288', {
    waitUntil: 'networkidle0',
  });
  await page.waitForTimeout(1000);

  await page.mainFrame().addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js' });
  const scriptContent = await utils.genScriptContent();
  await page.addScriptTag({ content: scriptContent });
  await page.evaluate((datas) => {
    setLocalStorageBatch(datas.storageLocal);
    setSessionStorageBatch(datas.storageSession);
  }, datas);
  console.log('启动完毕...');

  const sectionSelector = '.section-list .section';
  const screenshotSelector = '.book-section-content';
  const sectionList = await page.$$(sectionSelector);

  console.log('处理中...');
  for (let i = 0, length = sectionList.length; i < length; i++) {
    const item = sectionList[i];

    item.click();

    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const header = document.querySelector('.book-content__header');
      const stepPrev = document.querySelector('.step-btn--prev');
      const stepNext = document.querySelector('.step-btn--next');

      if (header) {
        header.style.display = 'none';
      }

      if (stepPrev) {
        stepPrev.style.display = 'none';
      }

      if (stepNext) {
        stepNext.style.display = 'none';
      }
    });

    const screenshotElement = await page.$(screenshotSelector);
    const screenshotBuffer = await screenshotElement.screenshot({
      path: path.resolve(outputPath, `image/page-${i}.png`),
      // type: 'jpeg',
      // quality: 100,
      // captureBeyondViewport: false,
      // fullPage: true,
      // encoding: 'base64',
    });

    await pdfPage.setContent(templateCompiled({ base64: screenshotBuffer.toString('base64') }));

    const totalPage = await page.$('html');
    const boundingBox = await totalPage.boundingBox();
    const screenshotElementWidth = boundingBox.width;
    const screenshotElementHeight = boundingBox.height;

    await pdfPage.pdf({
      path: path.resolve(outputPath, `pdf/page-${i}.pdf`),
      printBackground: true,
      width: `${screenshotElementWidth}px`,
      height: `${screenshotElementHeight}px`,
    });
  }
  console.log('导出完毕...');

  await page.close();
  await pdfPage.close();
  await browser.close();
}

execute();
