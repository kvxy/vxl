const express = require('express');
const http = require('http');
const fs = require('fs');
const pfs = fs.promises;

const app = express();
app.use(express.static('client'));

const server = http.createServer(app);
server.listen(process.env.PORT);

// compress src into one js file
let vxl = '';
(async function() {
  for(let file of fs.readdirSync('./src/')) {
    let data = await pfs.readFile('./src/' + file, 'utf8');
    vxl = vxl + `\n/** ${file} **/\n\n${data}\n\n`;
  }
  fs.writeFileSync('./client/vxl.js', vxl)
})();