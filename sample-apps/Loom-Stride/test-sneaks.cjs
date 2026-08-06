const SneaksAPI = require('sneaks-api');
const sneaks = new SneaksAPI();

console.log('--- Testing SneaksAPI Functionality ---');

// 1. getProducts
sneaks.getProducts("Yeezy Cinder", 10, function(err, products){
    if (err) {
      console.error('getProducts Error:', err.message);
    } else {
      console.log('getProducts Success! Count:', products ? products.length : 0);
      if (products && products.length > 0) {
        console.log('Sample product 1:', {
          shoeName: products[0].shoeName,
          brand: products[0].brand,
          styleID: products[0].styleID,
          thumbnail: products[0].thumbnail
        });
      }
    }

    // 2. getProductPrices
    sneaks.getProductPrices("FY2903", function(err, product){
        if (err) {
          console.error('getProductPrices Error:', err.message);
        } else {
          console.log('getProductPrices Success! Product styleID:', product ? product.styleID || product.shoeName : 'N/A');
        }

        // 3. getMostPopular
        sneaks.getMostPopular(10, function(err, popularProducts){
            if (err) {
              console.error('getMostPopular Error:', err.message);
            } else {
              console.log('getMostPopular Success! Count:', popularProducts ? popularProducts.length : 0);
            }
        });
    });
});
