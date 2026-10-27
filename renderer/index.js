const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function render() {
    const scenesPath = path.join(__dirname, '..', 'scenes.json');
    const framesDir = path.join(__dirname, '..', 'frames');

    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1920 });

    let globalFrame = 0;

    for (const scene of scenes) {
        console.log(`Rendering scene ${scene.scene}...`);

        for (let localFrame = 0; localFrame < scene.duration; localFrame++) {
            const html = `
                <html style="background: #000; color: #fff; font-family: sans-serif; margin: 0; overflow: hidden;">
                <body style="margin: 0; width: 1080px; height: 1920px; display: flex; justify-content: center; align-items: center;">
                    <div style="width: 1080px; height: 1920px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">

                        ${scene.component === 'SplitScreen' ? `
                            <div style="display: flex; width: 100%; height: 100%;">
                                <div style="width: 50%; height: 100%; background: #111; display: flex; align-items: center; justify-content: center; border-right: 2px solid #333;">
                                    <div style="text-align: center;">
                                        <div style="width: 300px; height: 400px; background: #222; border-radius: 50%; margin-bottom: 20px; box-shadow: 0 0 50px rgba(0,0,255,0.2);"></div>
                                        <p style="font-size: 30px;">SARAH (Anxious)</p>
                                    </div>
                                </div>
                                <div style="width: 50%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center;">
                                    <div style="width: 300px; height: 600px; background: #111; border: 5px solid #333; border-radius: 30px; padding: 20px; box-shadow: 0 0 30px rgba(255,255,255,0.1);">
                                        <p style="text-align: center; color: #888;">Voicemail</p>
                                        <p style="text-align: center; font-size: 24px; margin-top: 100px;">From: Me</p>
                                        <div style="width: 100%; height: 2px; background: #333; margin: 40px 0;"></div>
                                        <p style="text-align: center; color: #fff; font-size: 20px;">New message received</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${scene.component === 'VoicemailUI' ? `
                            <div style="width: 400px; height: 700px; background: #111; border: 5px solid #333; border-radius: 40px; padding: 30px; box-shadow: 0 0 50px #000;">
                                <p style="color: #888; text-align: center;">Call from Me</p>
                                <div style="width: 100%; height: 100px; background: #222; margin: 50px 0; display: flex; align-items: center; justify-content: center; border-radius: 10px; overflow: hidden;">
                                    <div style="width: ${Math.sin(localFrame * 0.1) * 50 + 100}px; height: 40px; background: #44f; border-radius: 5px;"></div>
                                </div>
                                <p style="font-size: 24px; line-height: 1.5; text-align: center; color: #ddd;">
                                    ${scene.props.transcript.substring(0, Math.floor(localFrame / 5))}
                                </p>
                            </div>
                        ` : ''}

                        ${scene.component === 'POV_Rainy' ? `
                            <div style="width: 1080px; height: 1920px; background: #050505; position: relative;">
                                <div style="width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), #111; display: flex; align-items: center; justify-content: center;">
                                    <div style="width: 400px; height: 200px; background: #000033; border: 2px solid #111; border-radius: 10px; box-shadow: 0 0 20px #000066;">
                                        <div style="width: 80px; height: 40px; background: #ffffaa; position: absolute; top: 50px; left: 20px; box-shadow: 0 0 20px #ffffaa;"></div>
                                        <div style="width: 80px; height: 40px; background: #ffffaa; position: absolute; top: 50px; right: 20px; box-shadow: 0 0 20px #ffffaa;"></div>
                                    </div>
                                </div>
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                                    ${Array.from({length: 20}).map((_, i) => `<div style="position: absolute; width: 1px; height: 20px; background: rgba(255,255,255,0.2); left: ${Math.random()*100}%; top: ${Math.random()*100}%; transform: rotate(10deg);"></div>`).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${scene.component === 'Reflection' ? `
                            <div style="width: 1080px; height: 1920px; background: #000; position: relative;">
                                <div style="width: 600px; height: 1000px; background: #0a0a0a; border-radius: 20px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                    <div style="text-align: center; color: #444;">
                                        <div style="width: 200px; height: 200px; background: #222; border-radius: 50%; margin: 0 auto 20px;"></div>
                                        <p>SARAH (Reflection)</p>
                                    </div>
                                </div>
                                <div style="position: absolute; right: 100px; bottom: 300px; width: 150px; height: 400px; background: #000; opacity: ${Math.min(localFrame/100, 0.6)}; transform: scale(${1 + localFrame/500});">
                                    <p style="color: #111; font-size: 10px; text-align: center;">SILHOUETTE</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </body>
                </html>
            `;

            await page.setContent(html);
            const fileName = `frame_${String(globalFrame).padStart(6, '0')}.png`;
            await page.screenshot({ path: path.join(framesDir, fileName) });

            globalFrame++;
        }
    }

    await browser.close();
    console.log(`Render complete. ${globalFrame} frames saved to ${framesDir}`);
}

render().catch(console.error);
