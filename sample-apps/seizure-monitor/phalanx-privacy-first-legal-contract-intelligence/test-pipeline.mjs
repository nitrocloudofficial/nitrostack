import fs from 'fs';
import path from 'path';

async function testPipeline() {
  const filePath = path.resolve('src/data/sample-contract.txt');
  const fileBuffer = fs.readFileSync(filePath);
  
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), 'sample-contract.txt');
  formData.append('contractType', 'general_contract');

  console.log('Sending POST to /api/analyze...');
  
  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      process.exit(1);
    }
    
    const result = await response.json();
    fs.writeFileSync('output.json', JSON.stringify(result, null, 2));
    console.log('Success! Wrote full payload to output.json');
    console.log(`Graph Nodes: ${result.graph.nodes.length}`);
    console.log(`Graph Edges: ${result.graph.edges.length}`);
    console.log(`Redacted Tokens: ${result.redaction.tokenCount}`);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

testPipeline();
