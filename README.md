# Automating Bluesky to Twitter Cross-posting

This repository contains a Google Apps Script (GAS) that automates the process of retrieving posts from a Bluesky feed and cross-posting them to Twitter. It utilizes a Google Spreadsheet for tracking posts and OAuth2 authentication for Twitter.

## Setup Instructions

### 1. Required Modifications
- **Twitter and Bluesky API credentials**: The script must be modified to dynamically obtain the following:
  - **Bluesky ID**
  - **Twitter ID**
  - **Google Spreadsheet ID**
  - **Twitter API Key and Secret**
- **Note**: This script is **not currently compatible with Bluesky's OAuth2.0**, and may become unusable in the future if Bluesky updates its authentication system.

### 2. Google Apps Script (GAS)
- Create a new Google Apps Script project by opening the script editor in a Google Spreadsheet.
- Copy and paste the code from this repository into the script editor.

### 3. Google Spreadsheet Setup
- Create a Google Spreadsheet with a sheet named **"List"**.
- The sheet should have the following columns, starting from row 1:
  - Column 1: Post ID
  - Column 2: Text
  - Column 3: Is Reply (true/false)
  - Column 4: Includes Embed (true/false)
  - Column 5: Is Repost (true/false)
  - Column 6: Is Bluesky Limited (true/false)
  - Column 7: Posted to Twitter (true/false)
  - Column 8: Reply To Post ID
  - Column 9: Twitter Tweet ID

### 4. OAuth2 Authentication for Twitter
- Replace the placeholders for **CLIENT_ID** and **CLIENT_SECRET** in the code with your Twitter Developer App credentials.
- Run the `doAuthorization()` function to initiate the OAuth2 authentication process.
- Follow the authorization URL displayed in the logs to grant access to Twitter.

### 5. Scheduling the Script
- In the Apps Script editor, use **GAS Triggers** to schedule the `Main()` function to run **once every minute**.
- This ensures the script continuously checks for new posts on Bluesky and cross-posts them to Twitter when applicable.

### 6. Posting Rules
- **Cross-posting of replies**: This script will only cross-post replies to **your own posts**.
- **Opt-out Mechanism**: If you want to prevent a Bluesky post from being cross-posted to Twitter, include the **Unicode Character “◌͏” (U+034F)** in the post text. The script will detect this and skip cross-posting.

## Functions Overview

- **Main()**: The main entry point of the script. It determines when to retrieve Bluesky posts and when to post them to Twitter.
- **ListUpBlueskyPosts()**: Fetches recent Bluesky posts and records them in the Google Spreadsheet.
- **SendPostsToTwitter()**: Posts the listed Bluesky posts to Twitter.
- **getPosts()**: Retrieves posts from the Bluesky API.
- **getAccessJwt()**: Manages the access token for Bluesky API requests.
- **sendTweet()**: Sends a tweet to Twitter using the Twitter API.
- **doAuthorization()**: Initiates OAuth2 authorization for Twitter.

## Important Notes

- This script is **not compatible with Bluesky's OAuth2.0**, so future changes to Bluesky’s authentication method may render it unusable.
- The **script should be triggered to run every minute** to keep the posting process running smoothly.

---

### Acknowledgement

- This script is a modification of the script in the article ["Blueskyに投稿したPostを自動でTwitterにも転載したい"](https://zenn.dev/henteko/articles/f13f1c9b43b94d) by **henteko** (https://github.com/henteko).
