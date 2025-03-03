"use strict";

const botEnabled = true;   // make sure .github workflow file's schedule uncommented when enabling this

const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require('fs');

if (!process.env.slack_webhook) {
    console.log("No slack_webhook URL found");
    process.exit(1)
}
let slack_webhook = process.env.slack_webhook;

let enableSlack = false;
if (process.env.action_slack !== undefined && process.env.action_slack === 'true') {
    enableSlack = true;
    console.log("action_slack is set to true: Slack message enabled");
}
else {
    enableSlack = false;
    console.log("action_slack is set to false: Slack message disabled");
}

function addPrefix(str, prefix) {
    let tmp = str.split('\n'),
        res = [];

    for (const frag of tmp) {
        res.push(`${prefix} ${frag}`);
    }

    return res.join('\n');
}

async function sendSlackMessage(message, incoming_webhook_url) {
    if (enableSlack === true) {
        const headers = {
            "Content-Type": "application/json",
        }
        const response = await fetch(incoming_webhook_url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                text: message
            })
        });

        if (response.status != 200) {
            console.log("error: " + await response.text());
        }
        else {
            console.log("message sent");
        }
    }
    else {
        // fs.appendFileSync(result_file, message + "\n");
        message = addPrefix(message, "onSlack > ")
        console.log(message);
    }
}

function getTwoDigitPaddedNumberString(number) {
    return number < 10 ? '0' + number : number;
}

async function getBodyFromUrl(url) {
    const response = await fetch(url);
    return await response.text();
}

function getDateFormat(date) {
    return date.getFullYear()
        + "/" + getTwoDigitPaddedNumberString(date.getMonth() + 1)
        + "/" + getTwoDigitPaddedNumberString(date.getDate());
}

let getPollenData = async function (date) {
    const dateFormat = getDateFormat(date);
    const url = "http://www.atlantaallergy.com/pollen_counts/index/" + dateFormat;
    const htmlBodyContent = await getDataFromWebsite(url);

    let jsonData = {
        pollenNum: 0
    };

    console.log(url);
    console.log(htmlBodyContent);
    
    const $ = cheerio.load(htmlBodyContent);

    $(".widget-pollen-count-full").each(function () {
        let pollenNum = $(this).find(".pollen-num").text().trim();
        if (pollenNum !== undefined && pollenNum !== "") {
            jsonData.pollenNum = parseInt(pollenNum);
        }
        else {
            console.log("Data not availble for " + dateFormat);
        }
    });

    let message = "";
    if (jsonData.pollenNum > 0) {
        let emoji = "😄";
        if (jsonData.pollenNum > 4000) emoji = "😡";
        else if (jsonData.pollenNum > 2500) emoji = "🥵";
        else if (jsonData.pollenNum > 1500) emoji = "😢";
        message = "Atlanta's Pollen Count for " + dateFormat + "\n"
            + "Data from <http://www.atlantaallergy.com/pollen_counts|Atlanta Allergy & Asthma>\n\n"
            + "> *(Total) " + jsonData.pollenNum + " " + emoji + "*";
    }
    else {
        message = "Data not available for " + dateFormat;
    }
    sendSlackMessage(message, slack_webhook);
    return jsonData;
};

async function getDataFromWebsite(url) {
    const body = await getBodyFromUrl(url);
    fs.writeFileSync('./data.html', body);
    return body;
}

async function main() {

    let today = new Date(); 
    if (botEnabled) {
        let pollenData = await getPollenData(today);
        console.log(pollenData);
    }
    else {
        let message = "Pollen Count bot disabled by 호랑이 :tiger: at " + getDateFormat(today) + "\n"
            + "It will not send daily notification until reenabled.\nSee you next year! :wave:"
        sendSlackMessage(message, slack_webhook);
    }
}

main();
