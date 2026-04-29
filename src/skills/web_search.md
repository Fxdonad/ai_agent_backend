# Skill: Web Search
- Search information using Brave API.
- Command: curl -s -H "X-Subscription-Token: ${env.get('brave_search_api_key')}" "https://api.search.brave.com/res/v1/web/search?q=<query>"