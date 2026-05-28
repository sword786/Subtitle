import fs from 'fs';
import FormData from 'form-data';
import http from 'http';

// Create a dummy file
fs.writeFileSync('/tmp/dummy.mp4', 'dummy data');

const form = new FormData();
form.append('video', fs.createReadStream('/tmp/dummy.mp4'));

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/transcribe',
  method: 'POST',
  headers: form.getHeaders(),
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data.substring(0, 200)}...`);
  });
});

req.on('error', (e) => {
  console.error(`Problem: ${e.message}`);
});

form.pipe(req);
