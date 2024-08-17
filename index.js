const fs = require('fs');
const path = require('path');

const sheetUrl = 'https://docs.google.com/spreadsheets/d/1veI7Mf2imu32CZ_K21JnTnYxybH63PGAxRNC_wjArvU/pub?output=csv';

function CsvToJson(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(value => value.replace(/(^"|"$)/g, '').trim());
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });

    return obj;
  });
}

function FetchAndSaveCSV() {
  fetch(sheetUrl)
    .then(response => {
      if (!response.ok) return;
      return response.text();
    })
    .then(csvData => {
      const jsonData = CsvToJson(csvData);
      const filePath = path.join(__dirname, 'data.json');

      fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), () => {
        ProcessJSONData();
      });
    });
}

function ParseDate(dateStr) {
  const [month, day, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function GenerateConfig(data, countryField) {
  const balanceMap = {};

  data.forEach(record => {
    const date = ParseDate(record.Date);
    const balances = record[countryField] ? record[countryField].split(',') : [];

    balances.forEach(balance => {
      if (balance) {
        if (!balanceMap[balance]) {
          balanceMap[balance] = { start_date: date, end_date: date };
        } else {
          balanceMap[balance].end_date = date;
        }
      }
    });
  });

  return {
    [`${countryField}_Balance`]: Object.keys(balanceMap).map(balance => ({
      start_date: formatDate(balanceMap[balance].start_date),
      end_date: formatDate(balanceMap[balance].end_date),
      balance: balance
    }))
  };
}

function ProcessJSONData() {
  const filePath = path.join(__dirname, 'data.json');

  fs.readFile(filePath, (err, data) => {
    if (err) return;

    const jsonData = JSON.parse(data);

    const cisConfig = GenerateConfig(jsonData, 'CIS');
    const euConfig = GenerateConfig(jsonData, 'EU');
    const ukConfig = GenerateConfig(jsonData, 'UK');

    const cisFilePath = path.join(__dirname, 'CIS.json');
    const euFilePath = path.join(__dirname, 'EU.json');
    const ukFilePath = path.join(__dirname, 'UK.json');

    fs.writeFile(cisFilePath, JSON.stringify(cisConfig, null, 2), () => {});
    fs.writeFile(euFilePath, JSON.stringify(euConfig, null, 2), () => {});
    fs.writeFile(ukFilePath, JSON.stringify(ukConfig, null, 2), () => {});
  });
}

FetchAndSaveCSV();
