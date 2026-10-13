import 'dotenv/config';

async function listPosts() {
    const posts = [];
    const { FB_PAGE_ID, IG_USER_ID, FB_API_VERSION, PAGE_ACCESS_TOKEN } = process.env;

    if (FB_PAGE_ID && PAGE_ACCESS_TOKEN) {
      try {
        // Added likes.summary(true) and comments.summary(true) for FB post engagement metrics
        const url = `https://graph.facebook.com/${FB_API_VERSION || 'v21.0'}/${FB_PAGE_ID}/published_posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&access_token=${PAGE_ACCESS_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("FB posts raw data:", JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('Failed to fetch FB posts', e);
      }
    }

    if (IG_USER_ID && PAGE_ACCESS_TOKEN) {
      try {
        // Added like_count and comments_count for IG post engagement metrics
        const url = `https://graph.facebook.com/${FB_API_VERSION || 'v21.0'}/${IG_USER_ID}/media?fields=id,caption,timestamp,like_count,comments_count&access_token=${PAGE_ACCESS_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("IG posts raw data:", JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('Failed to fetch IG posts', e);
      }
    }
}

listPosts();
