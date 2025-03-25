// filepath: /Users/isong/work/personal/pollen-count-poller/cmd/pollen-count/main.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// trigger

var (
	botEnabled   = true
	slackWebhook = os.Getenv("slack_webhook")
	enableSlack  = os.Getenv("action_slack") == "true"
)

func main() {
	if slackWebhook == "" {
		log.Println("No slack_webhook URL found")
		os.Exit(1)
	}

	today := time.Now()
	if botEnabled {
		pollenData, err := getPollenData(today)
		if err != nil {
			log.Println("failed to get pollen data: ", err)
		} else {
			fmt.Println(pollenData)
		}
	} else {
		message := fmt.Sprintf("Pollen Count bot disabled by 호랑이 :tiger: at %s\nIt will not send daily notification until reenabled.\nSee you next year! :wave:", getDateFormat(today))
		sendSlackMessage(message, slackWebhook)
	}
}

func addPrefix(str, prefix string) string {
	lines := strings.Split(str, "\n")
	for i, line := range lines {
		lines[i] = prefix + " " + line
	}
	return strings.Join(lines, "\n")
}

func sendSlackMessage(message, incomingWebhookURL string) {
	if enableSlack {
		payload := map[string]string{"text": message}
		payloadBytes, _ := json.Marshal(payload)
		resp, err := http.Post(incomingWebhookURL, "application/json", bytes.NewBuffer(payloadBytes))
		if err != nil {
			log.Println("Error sending message:", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			log.Println("Error on sending message to Slack:", string(body))
		} else {
			log.Println("Message sent")
		}
	} else {
		message = addPrefix(message, "onSlack > ")
		log.Println(message)
	}
}

func getTwoDigitPaddedNumberString(number int) string {
	if number < 10 {
		return fmt.Sprintf("0%d", number)
	}
	return fmt.Sprintf("%d", number)
}

func getBodyFromURL(url string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("received non-200 response: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	return string(body), nil
}

func getDateFormat(date time.Time) string {
	return fmt.Sprintf("%d/%s/%s", date.Year(), getTwoDigitPaddedNumberString(int(date.Month())), getTwoDigitPaddedNumberString(date.Day()))
}

func getPollenData(date time.Time) (map[string]int, error) {
	dateFormat := getDateFormat(date)
	url := "http://www.atlantaallergy.com/pollen_counts/index/" + dateFormat
	htmlBodyContent, err := getDataFromWebsite(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get data from website: %w", err)
	}
	log.Println(htmlBodyContent)

	jsonData := map[string]int{"pollenNum": 0}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlBodyContent))
	if err != nil {
		return nil, fmt.Errorf("failed to create document from html body: %w", err)
	}

	doc.Find(".widget-pollen-count-full").Each(func(i int, s *goquery.Selection) {
		pollenNum := s.Find(".pollen-num").Text()
		if pollenNum != "" {
			pollenNum = strings.TrimSpace(pollenNum)
			var pollenNumInt int
			fmt.Sscanf(pollenNum, "%d", &pollenNumInt)
			jsonData["pollenNum"] = pollenNumInt
		} else {
			log.Println("Data not available for", dateFormat)
		}
	})

	message := ""
	if jsonData["pollenNum"] > 0 {
		emoji := "😄"
		if jsonData["pollenNum"] > 4000 {
			emoji = "😡"
		} else if jsonData["pollenNum"] > 2500 {
			emoji = "🥵"
		} else if jsonData["pollenNum"] > 1500 {
			emoji = "😢"
		}
		message = fmt.Sprintf("Atlanta's Pollen Count for %s\nData from <http://www.atlantaallergy.com/pollen_counts|Atlanta Allergy & Asthma>\n\n> *(Total) %d %s*", dateFormat, jsonData["pollenNum"], emoji)
	} else {
		message = "Data not available for " + dateFormat
	}
	sendSlackMessage(message, slackWebhook)
	return jsonData, nil
}

func getDataFromWebsite(url string) (string, error) {
	body, err := getBodyFromURL(url)
	if err != nil {
		return "", fmt.Errorf("failed to get body from url: %w", err)
	}
	err = os.WriteFile("./data.html", []byte(body), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}
	return body, nil
}
