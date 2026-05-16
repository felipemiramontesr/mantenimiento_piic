import axios from 'axios';

async function test() {
  console.log('Testing API /v1/fleet...');
  try {
    const response = await axios.get('http://localhost:3001/v1/fleet');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (err: any) {
    console.log('Error Status:', err.response?.status);
    console.log('Error Data:', JSON.stringify(err.response?.data, null, 2));
    console.log('Error Message:', err.message);
  }
}

test();
