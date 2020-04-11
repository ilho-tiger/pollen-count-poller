# pollen-count-poller

![Pollen Count Poller](https://github.com/ilho-tiger/pollen-count-poller/workflows/Pollen%20Count%20Poller/badge.svg)

A little `Node.js` script that parses the website of [Atlanta Allergy & Asthma][Atlanta Allergy & Asthma] to get today's pollen count and pushes it to a Slack channel via [incoming webhook][incoming webhook]. 

## Build

To pull dependencies:

```sh
npm install
```

## Set up environment variables

The script reads from two environment variables:

| Variable Name   | Type           | Notes                                                                |
| --------------- | -------------- | -------------------------------------------------------------------- |
| `slack_webhook` | `string` (url) | a Slack incoming webhook URL to push messages                        |
| `action_slack`  | `true|false`   | send Slack message if `true`, redirect messages to console otherwise |

The script will fail if `slack_webhook` is not defined, even if `action_slack` is set to `false`. 

If `action_slack` is not defined, the value will be evaluated as `false` by the script automatically (thus Slack message will not be pushed). If it is evaluated as `false`, the message to be pushed Slack will be redirected to the console with `onSlack> ` prefix which allows debugging without Slack configured.

```sh
export slack_webhook='http://hook.slack.com/......'
export action_slack='false'
```

After defining environment variables as desired, run the script.

### Sample outputs

- with `action_slack` set to `false`:

    ```console
    $ node index.js
    action_slack is set to false: Slack message disabled
    onSlack >  Atlanta's Pollen Count for 2020/03/30
    onSlack >  Data from <http://www.atlantaallergy.com/pollen_counts|Atlanta Allergy & Asthma>
    onSlack >  
    onSlack >  > *(Total) 7113 😡*
    { pollenNum: 7113 }
    ```

- with `action_slack` set to `true`:

    ```console
    $ node index.js             
    action_slack is set to true: Slack message enabled
    { pollenNum: 7113 }
    message sent
    ```

## Scheduled trigger

This repo has a scheduled trigger implemented with [Github Actions][actions] which is schduled to send the Slack message everyday 8:30am EDT (or 12:30pm UTC). The [Atlanta Allergy & Asthma] website usually updated for the day before 8:30am EDT, this should send the updated value for the day.

```yaml
on:
  push:
    branches:
      - master
  schedule:
    - cron: '30 12 * * *'
```

[Atlanta Allergy & Asthma]: http://www.atlantaallergy.com/pollen_counts
[incoming webhook]: https://api.slack.com/messaging/webhooks
[actions]: https://github.com/ilho-tiger/pollen-count-poller/actions