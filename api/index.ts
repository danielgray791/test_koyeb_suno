import { readFileSync } from 'fs';
import { Page, chromium, Frame, Cookie, Browser, CDPSession, Route, BrowserContext } from 'patchright';

const OBFS = readFileSync('C:/xampp/htdocs/garutcapil/hcaptcha/turnstilebypasser/obfs.txt', 'utf-8');
const SUNO_HTML = readFileSync('C:/xampp/htdocs/garutcapil/hcaptcha/turnstilebypasser/src/assets/suno.html', 'utf-8');
const USER_AGENT_SELECTED = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36`;
const CHROMIUM_EXECUTABLE_PATH = `C:/Users/Muhammad Raivaldy/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe`;

function getFrame(url: string | RegExp, page: Page): Frame | null {
    const frames = page.frames();
    for (const frame of frames) {
        if (typeof url === 'string') {
            if (frame.url() === url) {
                return frame;
            }
        } else if (url instanceof RegExp) {
            if (url.test(frame.url())) {
                return frame;
            }
        }
    }
    return null;
}

async function initBrowser(headless: boolean = true): Promise<[Browser, Page, CDPSession]> {
    const browser = await chromium.launch({
        args: [
            `--user-agent=${USER_AGENT_SELECTED}`
        ],
        headless: headless,
        executablePath: CHROMIUM_EXECUTABLE_PATH
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdpSession = await page.context().newCDPSession(page);
    await page.addInitScript(OBFS);

    return [browser, page, cdpSession];
}

// Fungsi sleep yang menerima waktu dalam milidetik
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getTurnstileToken(headless: boolean = false) {
    return new Promise<string | undefined> (async function (resolve, reject) { 
        const url = "https://suno.com/"; 
        const [browser, page, cdpSession] = await initBrowser(headless);

        await page.route(url, async function (route: Route) {
            // console.log(route.request().method(), route.request().url());
            if (route.request().method() === "GET") {
                route.fulfill({body: SUNO_HTML, status: 200})
            }
        })
        await page.goto(url);
        var start = Date.now();

        while(true) {
            try {
                var timeTaken = Date.now();
    
                if (timeTaken - start >= 30000) {
                    // console.log("reload lagi");
                    await page.goto(url);
                    start = Date.now();
                }

                const tokenElement = page.locator("#turnstile-token");
                const token = await tokenElement.inputValue();
                
                if (token) {
                    await browser.close();
                    // console.log(token);
                    resolve(token);
                    break;
                }
    
                const turnstileFrame = getFrame(/https:\/\/challenges.*auto\//, page);
                if (turnstileFrame) {
                    // console.log("Turnstile frame terdeteksi");
                    await turnstileFrame.click("body", {delay: 1500});   
                    // console.log("Berhasil mengklik!");  
                }
            } catch (err) {
                // console.log(`Exception: ${err}`);
            }

            await sleep(1000);
        }
    });
}

async function main() {
    const token = await getTurnstileToken(false);
    // console.log(token)
}

(async () => {
    await main();
})();
// main()
