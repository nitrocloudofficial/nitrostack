# Testing Tools

## Manual Tool Testing

1. Start dev mode: \`npm run dev\`
2. Navigate to **Tools** page
3. Click **Execute** on any tool
4. Fill in input fields
5. View results and UI widgets

## Widget Preview

- Click **Enlarge** to view widget in modal
- Widgets render with example data from \`@Tool\` decorator

## Tool Execution

### Input Form

- Auto-generated from \`inputSchema\`
- Supports: strings, numbers, booleans, enums
- Shows descriptions and validation rules

### Response Display

- JSON response
- UI widget (if attached)
- Execution time

## Debugging

### Browser Console

```javascript
// Check tool definitions
console.log(window.__tools);

// Check connection status
console.log(window.__mcpConnected);
```

### Network Tab

- Check API calls to \`/api/tools\`, \`/api/resources\`
- Verify tool execution requests

## Next Steps

- [Chat Interface](./03-chat-interface.md)
- [Tools Guide](../sdk/typescript/04-tools-guide.md)
