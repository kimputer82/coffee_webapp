const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, pool } = require('./db');

async function updateImages() {
  try {
    console.log('Updating menu images...');
    
    await query("UPDATE menus SET image = '/images/americano-ice.jpg' WHERE name = '아메리카노(ICE)'");
    await query("UPDATE menus SET image = '/images/americano-hot.jpg' WHERE name = '아메리카노(HOT)'");
    await query("UPDATE menus SET image = '/images/caffe-latte.jpg' WHERE name = '카페라떼'");
    
    console.log('Menu images updated successfully.');
  } catch (error) {
    console.error('Failed to update images:', error);
  } finally {
    await pool.end();
  }
}

updateImages();
