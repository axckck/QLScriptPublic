/**
 * 恩山无线论坛自动签到（加强推送版）
 * 
 * cron: 10 8 * * *
 * 
 * 变量名: ENSHAN_COOKIE
 * 多账号用 & 或换行分隔
 */

const axios = require("axios");
let sendNotify = () => {};
try {
    sendNotify = require("./sendNotify").sendNotify;
} catch (e) {
    console.log("⚠️ 未找到 sendNotify.js");
}

const cookies = (process.env.ENSHAN_COOKIE || "").split(/[\n&]/).filter(Boolean);

let message = "";
let successList = [];
let failList = [];
const startTime = Date.now();

async function sign(cookie, index) {
    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            Cookie: cookie,
            Referer: "https://www.right.com.cn/forum/erling_qd-sign_in.html",
        };

        // 获取签到页
        const pageRes = await axios.get("https://www.right.com.cn/forum/erling_qd-sign_in.html", { 
            headers, timeout: 12000 
        });
        const html = pageRes.data;

        const formhashMatch = html.match(/formhash["']?\s*value=["']?([a-zA-Z0-9]+)/) || 
                             html.match(/formhash=([a-zA-Z0-9]+)/);
        
        if (!formhashMatch) throw new Error("获取 formhash 失败");

        const formhash = formhashMatch[1];

        // 执行签到
        const signRes = await axios.post(
            "https://www.right.com.cn/forum/plugin.php?id=erling_qd:action&action=sign",
            `formhash=${formhash}`,
            { 
                headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 12000 
            }
        );

        const data = typeof signRes.data === "string" ? signRes.data : JSON.stringify(signRes.data);

        if (data.includes('"success":true') || data.includes("签到成功")) {
            let days = "1";
            try {
                const json = typeof signRes.data === "object" ? signRes.data : JSON.parse(signRes.data);
                days = json.continuous_days || json.days || "1";
            } catch {}
            
            const msg = `✅ 账号${index} 签到成功（连续 ${days} 天）`;
            console.log(msg);
            successList.push(`账号${index}（${days}天）`);
            message += msg + "\n";
        } else if (data.includes("已签到") || data.includes("今天已经签到")) {
            const msg = `🟡 账号${index} 今日已签到`;
            console.log(msg);
            successList.push(`账号${index}（已签）`);
            message += msg + "\n";
        } else {
            throw new Error("签到失败");
        }

    } catch (e) {
        const msg = `❌ 账号${index} 签到失败`;
        console.log(msg);
        failList.push(`账号${index}`);
        message += msg + "\n";
    }
}

!(async () => {
    if (cookies.length === 0) {
        console.log("❌ 未检测到 ENSHAN_COOKIE 变量");
        return;
    }

    console.log(`🔔 恩山无线论坛签到开始 | 共 ${cookies.length} 个账号\n`);

    for (let i = 0; i < cookies.length; i++) {
        await sign(cookies[i], i + 1);
        if (i < cookies.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // ==================== 推送内容美化 ====================
    let title = `🔔 恩山无线论坛签到报告`;
    let content = `签到时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `📊 签到统计\n`;
    content += `✅ 成功：${successList.length} 个\n`;
    content += `❌ 失败：${failList.length} 个\n`;
    content += `👤 总账号：${cookies.length} 个\n`;
    content += `⏱️ 耗时：${duration} 秒\n\n`;
    content += `━━━━━━━━━━━━━━\n`;

    if (successList.length > 0) {
        content += `✅ 成功账号：\n${successList.join("\n")}\n\n`;
    }
    if (failList.length > 0) {
        content += `❌ 失败账号：\n${failList.join("\n")}\n\n`;
    }

    content += message;
    content += `━━━━━━━━━━━━━━`;

    console.log("\n" + content);

    // 发送通知 + 超时保护
    try {
        await Promise.race([
            sendNotify(title, content),
            new Promise((_, reject) => setTimeout(() => reject(new Error("超时")), 10000))
        ]);
        console.log("✅ 通知推送完成");
    } catch (e) {
        console.log("⚠️ 通知推送超时（签到结果正常）");
    }

    console.log("🎉 任务执行完毕！");
})();
