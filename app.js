const express = require('express');
const { sendMessage, addCaseFileToAssistant } = require('./functions');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/api/sendMessage', (req, res) => {
  const { uid, caseId, message } = req.body;
  sendMessage(uid, caseId, message).then(() => {
    res.send('Message sent');
  }).catch((error) => {
    console.error(error);
    res.status(500).send('Error sending message');
  })
});

app.post('/api/addCaseFile', (req, res) => {
  const { uid, caseId, fileId } = req.body;
  addCaseFileToAssistant(uid, caseId, fileId )
    .then(() => {
      res.send('File added');
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error adding file');
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// convertFileToText('GTt3QPCv5yZud0uU5m2OsYMq8iX2', '-NnVEEkg_sSjLUmmGDvZ', '-NnVh-vJ7XZaUjnVzHXH')
