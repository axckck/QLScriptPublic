/*
------------------------------------------
@Author: sm
@Date: 2025.05.17（已适配新域名）
@Description: 叮当快药（新域名修复版）
cron: 9 9 * * *
------------------------------------------
变量值: loginToken#userId#uDate
*/

const { Env } = require("../tools/env")
const $ = new Env("叮当快药");
let ckName = `ddky`;
const strSplitor = "#";
const axios = require("axios");
const defaultUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001e31) NetType/WIFI Language/zh_CN miniProgram"

const BASE_URL = "https://hxapi.ddky.com";   // ← 新域名

class Task {
    constructor(env) {
        this.index = $.userIdx++
        this.token = env.split(strSplitor)[0];
        this.userId = env.split(strSplitor)[1];
        this.uDate = env.split(strSplitor)[2];
    }

    async run() {
        await this.getSignInId()
    }

    getSign(s) {
        const crypto = require("crypto");
        return crypto.createHash('md5').update(s).digest('hex');
    }

    getTime() {
        var now = new Date();
        var year = now.getFullYear(),
            month = now.getMonth() + 1,
            day = now.getDate(),
            hours = now.getHours(),
            minutes = now.getMinutes(),
            seconds = now.getSeconds();
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }

    getSignDay() {
        var now = new Date();
        var year = now.getFullYear(),
            month = now.getMonth() + 1,
            day = now.getDate();
        return year + '-' + month + '-' + day
    }

    async getSignInId() {
        const time = this.getTime()
        const method = `ddky.promotion.signin.pageinfo`
        const signDay = this.getSignDay()

        const str = method +
            `loginToken${this.token}` +
            `method${method}` +
            `platH5` +
            `platformH5` +
            `signDay${signDay}` +
            `t${time}` +
            `uDate${this.uDate}` +
            `userId${this.userId}` +
            `v1.0` +
            `versionName4.9.0` +
            `6C57AB91A1308E26B797F4CD382AC79D`

        let sign = (this.getSign(str)).toUpperCase();
        let callbackStr = new Date().getTime()

        try {
            let options = {
                url: `${BASE_URL}/mcp/weixin/rest.htm?sign=${sign}&loginToken=${this.token}&method=${method}&plat=H5&platform=H5&signDay=${signDay}&t=${time}&uDate=${this.uDate}&userId=${this.userId}&v=1.0&versionName=4.9.0&callback=Zepto${callbackStr}`,
                headers: {},
            }

            let { data: response } = await axios.request(options);

            let resultStr = response.replace(`Zepto${callbackStr}`, "")
                                   .replaceAll("(", "")
                                   .replaceAll(")", "");
            let result = JSON.parse(resultStr);

            console.log(`[账号${this.index + 1}] 返回状态: ${result.code}`);

            if (result.code == "0" || result.code == 0) {
                const signDayVo = result?.result?.signDayVo || result?.data?.signDayVo;

                if (signDayVo && signDayVo.signinId) {
                    console.log(`[账号${this.index + 1}] ✅ 获取签到ID: ${signDayVo.signinId}`);
                    await this.sign(signDayVo.signinId);
                } else {
                    console.log(`[账号${this.index + 1}] ⚠️ 今日可能已签到或无签到活动`);
                }
            } else {
                console.log(`[账号${this.index + 1}] ❌ 获取失败: ${result.message || result.msg || JSON.stringify(result)}`);
            }

        } catch (e) {
            console.log(`[账号${this.index + 1}] 请求异常: ${e.message}`);
        }
    }

    async sign(signInId) {
        if (!signInId) return;

        let callbackStr = new Date().getTime()
        const time = this.getTime()

        const str = `ddky.promotion.signin.sign` + 
                    `channelH5` + 
                    `laterSignType1` + 
                    `loginToken${this.token}` + 
                    `methodddky.promotion.signin.sign` +
                    `platH5` + 
                    `platformH5` + 
                    `signinId${signInId}` + 
                    `t${time}` + 
                    `uDate${this.uDate}` + 
                    `userId${this.userId}` + 
                    `v1.0` + 
                    `versionName4.9.0` +
                    `6C57AB91A1308E26B797F4CD382AC79D`

        let sign = (this.getSign(str)).toUpperCase();

        try {
            let options = {
                url: `${BASE_URL}/mcp/weixin/rest.htm?sign=${sign}&channel=H5&laterSignType=1&loginToken=${this.token}&method=ddky.promotion.signin.sign&plat=H5&platform=H5&signinId=${signInId}&t=${time}&uDate=${this.uDate}&userId=${this.userId}&v=1.0&versionName=4.9.0&callback=Zepto${callbackStr}`,
                headers: {},
            }

            let { data: response } = await axios.request(options);

            let resultStr = response.replace(`Zepto${callbackStr}`, "")
                                   .replaceAll("(", "")
                                   .replaceAll(")", "");
            let result = JSON.parse(resultStr);

            if (result.code == "0" || result.code == 0) {
                $.log(`[账号${this.index + 1}] ✅ 签到成功`);
            } else {
                $.log(`[账号${this.index + 1}] ❌ 签到失败`);
            }
        } catch (e) {
            console.log(`[账号${this.index + 1}] 签到异常: ${e.message}`);
        }
    }
}

!(async () => {
    $.checkEnv(ckName);

    for (let user of $.userList) {
        await new Task(user).run();
    }
})()
    .catch((e) => console.log(e))
    .finally(() => $.done());
