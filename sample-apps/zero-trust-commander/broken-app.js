import express from 'express';

const app = express();
const PORT = 8080;

// Simulates a database connection that accidentally got wiped out
let databaseConnection = null; 

app.get('/', (req, res) => {
    res.send('Payment Gateway is running smoothly! (For now...)');
});

app.get('/checkout', (req, res) => {
    console.log('[ERROR] Processing checkout...');
    // THE BUG: Trying to access .query on a null object
    const result = databaseConnection.query('SELECT * FROM users'); 
    
    res.send('Checkout successful!');
});

app.listen(PORT, () => {
    console.log(`[SERVICE] Payment Gateway running on http://localhost:${PORT}`);
});
