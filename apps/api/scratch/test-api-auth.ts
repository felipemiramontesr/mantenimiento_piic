import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const secret = process.env.JWT_SECRET || 'dev-secret';

async function test() {
  console.log('Generating token...');
  const token = jwt.sign({ id: 1, role: 'ADMIN' }, secret, { expiresIn: '1h' });
  
  console.log('Calling API /v1/fleet...');
  try {
    const response = await axios.get('http://localhost:3001/v1/fleet', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response Status:', response.status);
    console.log('Units Count:', response.data.count);
    console.log('Sample Unit Images:', response.data.data[0].images);
  } catch (err: any) {
    console.error('API Call Failed:', err.response?.status, err.response?.data || err.message);
  }
}

test();
