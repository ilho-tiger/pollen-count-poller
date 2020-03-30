"use strict";

const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Papa = require("papaparse");
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

let getPollenData = async function (date) {
    let dateFormat = getTwoDigitPaddedNumberString(date.getMonth() + 1) + "/" + getTwoDigitPaddedNumberString(date.getDate()) + "/" + date.getFullYear();

    const body = await getBodyFromUrl("http://www.atlantaallergy.com/pollen_counts/index/" + dateFormat);

    console.log(body);
    fs.writeFileSync('./data.html', body);
    const $ = cheerio.load(body);
    let resultString = "haha";
    let jsonData = {};
 
    sendSlackMessage(resultString, slack_webhook);
    return jsonData;
};

async function main() {

    let today = new Date();
    let pollenData = await getPollenData(today);

    console.log(pollenData);
}

main();