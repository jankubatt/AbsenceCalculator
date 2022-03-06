const { app, BrowserWindow } = require('electron')
const path = require('path')

//AXIOS
var axios = require('axios');
/*var qs = require('qs');
var data = qs.stringify({
  'username': BakaUser,
  'password': BakaPass,
  'returnUrl': '/Timetable/Public/Actual/Class/2F',
  'login': '' 
});*/

//OTHER LIBRARIES
const fs = require('fs');
const puppeteer = require('puppeteer');
const he = require('he');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

