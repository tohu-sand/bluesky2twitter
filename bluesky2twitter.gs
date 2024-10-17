function Main() {
    var currentDate = new Date();
    var currentHour = currentDate.getHours();
    var currentMinute = currentDate.getMinutes();
  
    // Check if it's between 1AM and 7AM and if it's the 30th minute
    if ((currentHour >= 1 || currentHour < 7) && currentMinute == 30) {
      ListUpBlueskyPosts();
      SendPostsToTwitter();
    } 
    // For all other times, post immediately
    else if (currentHour < 1 || currentHour >= 7) {
      ListUpBlueskyPosts();
      SendPostsToTwitter();
    }
  }
  
  const bsky_identifier = "example_user.bsky.social";  // Bluesky ID
  const twitter_identifier = "example_user";  // Twitter ID
  const sheetId = 'example_sheet_id';  // Google Spreadsheet ID
  
  function ListUpBlueskyPosts() {
    const sheetName = 'List';
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    const rowNum = lastRow === 1 ? lastRow : lastRow - 1;
    const postIdRange = sheet.getRange(2, 1, rowNum);
    const postIdValues = postIdRange.getValues().flat();
  
    const accessJwt = getAccessJwt(bsky_identifier);
    const responseJSON = getPosts(accessJwt, bsky_identifier);
  
    for (let i = responseJSON.feed.length - 1; i >= 0; i--) {
      const feed = responseJSON.feed[i];
      const postId = feed.post.cid;
      let text = feed.post.record.text;
      const isReply = feed.post.record.reply !== undefined;
      const isIncludeEmbed = feed.post.record.embed !== undefined;
      let isBskyLimited = false;
      const isRepost = feed.reason !== undefined;
      let replyToPostId = null;
  
      if (text.includes('\u034F')) {
        isBskyLimited = true;
      }
  
      // Replace Bluesky identifier with Twitter identifier if present in the text
      if (text.includes(bsky_identifier)) {
        text = text.replaceAll(bsky_identifier, twitter_identifier);
      }
  
      if (isReply) {
        replyToPostId = feed.post.record.reply.parent.cid;
      }
  
      // Skip posts already present in the spreadsheet
      if (postIdValues.includes(postId)) {
        continue;
      }
  
      sheet.appendRow([postId, text, isReply, isIncludeEmbed, isRepost, isBskyLimited, false, replyToPostId]);
    }
  }
  
  function getPosts(accessJwt, identifier) {
    let url = "https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=" + identifier + "&limit=5";
  
    const options = {
      "method": "get",
      "contentType": "application/json",
      "headers": {
        "Authorization": `Bearer ${accessJwt}`
      }
    };
  
    let response = UrlFetchApp.fetch(url, options);
    let responseJSON = JSON.parse(response.getContentText());
  
    return responseJSON;
  }
  
  function getAccessJwt(identifier) {
    var userProps = PropertiesService.getUserProperties();
    
    // Retrieve the session token and its expiration time
    var accessJwt = userProps.getProperty('accessJwt');
    var tokenExpiry = userProps.getProperty('tokenExpiry');
    var currentTime = Math.floor(new Date().getTime() / 1000); // Get current time in seconds
  
    // Reuse token if it exists and is still valid
    if (accessJwt && tokenExpiry && currentTime < tokenExpiry) {
      Logger.log('Reusing cached accessJwt');
      return accessJwt;
    }
  
    // Fetch new token if none exists or it's expired
    Logger.log('Fetching new accessJwt');
    const password = "example_password";  // Bluesky password
    let url = "https://bsky.social/xrpc/com.atproto.server.createSession";
  
    var data = {
      "identifier": identifier,
      "password": password
    };
  
    var options = {
      method: "post",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      payload: JSON.stringify(data),
    };
  
    var response = UrlFetchApp.fetch(url, options);
    var responseJson = JSON.parse(response.getContentText());
  
    accessJwt = responseJson.accessJwt;
    var expiresIn = responseJson.expiresIn || 7200; // Default expiration is 2 hours if not provided
    tokenExpiry = currentTime + expiresIn;
  
    // Save the new token and its expiration time
    userProps.setProperty('accessJwt', accessJwt);
    userProps.setProperty('tokenExpiry', tokenExpiry);
  
    return accessJwt;
  }
  
  const CLIENT_ID = 'example_client_id';  // Twitter API client ID
  const CLIENT_SECRET = 'example_client_secret';  // Twitter API client secret
  
  function SendPostsToTwitter() {
    const sheetName = 'List'
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
  
    const postRange = sheet.getRange(2, 1, lastRow - 1, 9);
    const postValues = postRange.getValues();
  
    postValues.forEach((post, index) => {
      const postId = post[0];
      const text = post[1];
      const isReply = post[2];
      const isIncludeEmbed = post[3];
      const isRepost = post[4];
      const isBskyLimited = post[5];
      const isTwitterPosted = post[6];
      const replyToPostId = post[7];
      const twitterTweetId = post[8];
  
      if (![isIncludeEmbed, isRepost, isBskyLimited, isTwitterPosted].includes(true)) {
        let tweetId;
        if (isReply && replyToPostId) {
          const replyTweetId = getTweetIdFromPostId(replyToPostId);
          if (replyTweetId) {
            tweetId = sendTweet(text, replyTweetId);
          }
        } else {
          tweetId = sendTweet(text);
        }
  
        if (tweetId) {
          sheet.getRange(index + 2, 9).setValue(tweetId);
          sheet.getRange(index + 2, 7).setValue(true);
        }
      }
    });
  }
  
  function getTweetIdFromPostId(postId) {
    const sheetName = 'List';
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
  
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === postId) {
        return data[i][8];
      }
    }
    return null;
  }
  
  function sendTweet(text, replyTweetId) {
    var payload = {
      'text': text
    };
  
    if (replyTweetId) {
      payload['reply'] = {
        'in_reply_to_tweet_id': replyTweetId
      };
    }
  
    var service = getService();
    if (service.hasAccess()) {
      var url = `https://api.twitter.com/2/tweets`;
      var response = UrlFetchApp.fetch(url, {
        'method': 'POST',
        'contentType': 'application/json',
        'headers': {
          'Authorization': 'Bearer ' + service.getAccessToken()
        },
        'muteHttpExceptions': true,
        'payload': JSON.stringify(payload)
      });
      var result = JSON.parse(response.getContentText());
      if (result.data && result.data.id) {
        var tweetId = result.data.id;
        Logger.log('Tweet ID: ' + tweetId);
        return tweetId;
      } else {
        Logger.log('Error posting tweet: ' + JSON.stringify(result));
        return null;
      }
    } else {
      var authorizationUrl = service.getAuthorizationUrl();
      Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
    }
  }
  
  function doAuthorization() {
    const service = getService();
    if (service.hasAccess()) {
      Logger.log("Already authorized");
    } else {
      const authorizationUrl = service.getAuthorizationUrl();
      Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
    }
  }
  
  function getService() {
    pkceChallengeVerifier();
    const userProps = PropertiesService.getUserProperties();
    const scriptProps = PropertiesService.getScriptProperties();
    return OAuth2.createService('twitter')
      .setAuthorizationBaseUrl('https://twitter.com/i/oauth2/authorize')
      .setTokenUrl('https://api.twitter.com/2/oauth2/token?code_verifier=' + userProps.getProperty("code_verifier"))
      .setClientId(CLIENT_ID)
      .setClientSecret(CLIENT_SECRET)
      .setCallbackFunction('authCallback')
      .setPropertyStore(userProps)
      .setScope('users.read tweet.read tweet.write offline.access')
      .setParam('response_type', 'code')
      .setParam('code_challenge_method', 'S256')
      .setParam('code_challenge', userProps.getProperty("code_challenge"))
      .setTokenHeaders({
        'Authorization': 'Basic ' + Utilities.base64Encode(CLIENT_ID + ':' + CLIENT_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded'
      })
  }
  
  function authCallback(request) {
    const service = getService();
    const authorized = service.handleCallback(request);
    if (authorized) {
      return HtmlService.createHtmlOutput('Success!');
    } else {
      return HtmlService.createHtmlOutput('Denied.');
    }
  }
  
  function pkceChallengeVerifier() {
    var userProps = PropertiesService.getUserProperties();
    if (!userProps.getProperty("code_verifier")) {
      var verifier = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  
      for (var i = 0; i < 128; i++) {
        verifier += possible.charAt(Math.floor(Math.random() * possible.length));
      }
  
      var sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)
  
      var challenge = Utilities.base64Encode(sha256Hash)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      userProps.setProperty("code_verifier", verifier)
      userProps.setProperty("code_challenge", challenge)
    }
  }
  
  function logRedirectUri() {
    var service = getService();
    Logger.log(service.getRedirectUri());
  }
  