import express, { Express, Request, Response } from "express";
const app: Express  = express();
import patchright, { Browser, Page, Frame, CDPSession, Route } from "patchright";
import chromium from "@sparticuz/chromium-min";

const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36`;
const obfsScriptUrl = `https://pastebin.com/raw/VVdu3Equ`;
const sunoHtmlUrl = `https://pastebin.com/raw/ym4HxgZE`;
const remoteExecutablePath =
 `https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar`;
let browser: patchright.Browser;
let obfsScriptText: string;
let sunoHtmlText: string;

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

async function getPastebinContent(url: string): Promise<string> {
    const res = await fetch(url);
    return await res.text();
}

// Fungsi sleep yang menerima waktu dalam milidetik
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function initBrowser(): Promise<[Browser, Page, CDPSession]> {
    if (browser === undefined) {
        browser = await patchright.chromium.launch({
            args: [...chromium.args, `--user-agent=${userAgent}`],
            executablePath: await chromium.executablePath(remoteExecutablePath),
            headless: true,
        });
    }
           
    const page = await browser.newPage();
    const cdpSession = await page.context().newCDPSession(page);
    if (!obfsScriptText && !sunoHtmlText) {
        obfsScriptText = await getPastebinContent(obfsScriptUrl);
        sunoHtmlText = await getPastebinContent(sunoHtmlUrl);
    }
    await page.addInitScript(obfsScriptText);

    return [browser, page, cdpSession];
}

app.get("/", async function (req, res) {
    try {
        const url = "https://suno.com";
        const [browser, page, cdpSession] = await initBrowser();

        await page.route(url, async function (route: Route) {
            console.log(route.request().method(), route.request().url());
            if (route.request().method() === "GET") {
                route.fulfill({body: sunoHtmlText, status: 200})
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
                    await page.close();
                    console.log("Token terlihat");
                    console.log(token);
                    res.status(200).send({token: token})
                    break;
                }
    
                const turnstileFrame = getFrame(/https:\/\/challenges.*auto\//, page);
                if (turnstileFrame) {
                    console.log("Turnstile frame terdeteksi");
                    await turnstileFrame.click("body", {delay: 1500});   
                    console.log("Berhasil mengklik!");  
                }
            } catch (err) {
                console.log(`Exception: ${err}`);
            }

            await sleep(1000);
        }


        // const pageContent = await page.content();
        // await browser.close();
        // res.send(await page.evaluate(function() { return navigator.userAgent }));
    } catch (err) {
        res.status(500).send("Error" + err);
    }

});

app.listen(3000, function() { 
    console.log("Server ready on port 3000.")
});

module.exports = app;

// Jqawz9m8hpFHllaKqYmlFzmD
