import puppeteer from 'puppeteer-core';
import chromium from "@sparticuz/chromium";
import * as marked from 'marked';
import logger from './logger.js';

export async function convertMermaidToImage(mermaidSyntax: string){
  logger.info(`Input: ${mermaidSyntax}`);
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;
  try{
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath('/opt/nodejs/node_modules/@sparticuz/chromium/bin'),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@11.3.0/dist/mermaid.min.js"></script>
          <script>
            mermaid.initialize({ startOnLoad: true });
          </script>
        </head>
        <body>
          <pre class="mermaid">
            ${mermaidSyntax}
          </pre>
        </body>
      </html>
    `);
    const mermaidContent = await page.$('.mermaid');
    const png = await mermaidContent?.screenshot({type: 'png'});
    return png;
  }catch(e){
    logger.error(JSON.stringify(e));
    throw new Error(JSON.stringify(e))
  }
}

export async function convertMDToPDF(markdownText: string){
  logger.info(`Input: ${markdownText}`);
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;
  try{
    const browser = await puppeteer.launch({
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-sandbox",
        "--no-zygote",
        "--single-process",
        "--proxy-server='direct://'",
        "--proxy-bypass-list=*",
        "--font-render-hinting=none"
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath('/opt/nodejs/node_modules/@sparticuz/chromium/bin'),
      headless: chromium.headless,
    });
    const html = marked.parse(markdownText);
    console.log(`html: ${html}`)
    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Findings Report</title>
        </head>
        <body>
        ${html}
        </body>
      </html>
    `, {waitUntil: 'networkidle0'});
    logger.info(`page: ${JSON.stringify(await page.content())}`)
    const pdf = await page.pdf({
      format: 'A4',
      displayHeaderFooter: true,
      margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
      },
      headerTemplate:`<div style="font-size: 9px; margin-left: 1cm;"> <span class='title'></span></div> <div style="font-size: 9px; margin-left: auto; margin-right: 1cm; "> <span class='date'></span></div>`,
      footerTemplate: `<div style="font-size: 8px; margin: 0 auto;"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>`,
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.8,
    })
    return pdf;
  }catch(e){
    logger.error(JSON.stringify(e));
    throw new Error(JSON.stringify(e))
  }
}