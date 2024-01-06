const express = require('express');
const { convertFileToText } = require('./functions');
const app = express();
const port = 8080;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// convertFileToText('GTt3QPCv5yZud0uU5m2OsYMq8iX2', '-NnVEEkg_sSjLUmmGDvZ', '-NnVh-vJ7XZaUjnVzHXH')
