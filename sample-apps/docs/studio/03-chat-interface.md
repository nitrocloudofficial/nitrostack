# Chat Interface

## Overview

The Studio includes an AI chat interface for testing your MCP tools with OpenAI or Gemini.

## Setup

### OpenAI

1. Get API key from https://platform.openai.com
2. In Studio, go to **Chat** page
3. Select **OpenAI** provider
4. Enter your API key
5. Choose model (gpt-4, gpt-3.5-turbo)

### Gemini

1. Get API key from https://makersuite.google.com/app/apikey
2. In Studio, go to **Chat** page
3. Select **Gemini** provider
4. Enter your API key
5. Choose model (gemini-2.0-flash-exp recommended)

## Using the Chat

### Text Conversations

```
You: Show me all products
AI: [Calls browse_products tool]
    [Renders products-grid widget]
    Here are the available products...
```

### Tool Calling

The AI automatically:
1. Determines which tools to call
2. Executes them with correct parameters
3. Renders UI widgets for results
4. Continues conversation with context

### Widget Rendering

Widgets appear inline in the chat:
- Product grids
- User profiles
- Order confirmations
- Cart displays

## Best Practices

1. **Be specific** - "Show products in Electronics category"
2. **Chain operations** - "Add item to cart and show checkout"
3. **Use context** - AI remembers previous interactions
4. **Test flows** - Complete user journeys

## Debugging

- Check browser console for errors
- Verify tool schemas are correct
- Ensure example data is provided

## Next Steps

- [Tools Guide](../sdk/typescript/04-tools-guide.md)
- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md)
