let BakaURL = sessionStorage.getItem("url");
let BakaUser = sessionStorage.getItem("username");
let BakaPass = sessionStorage.getItem("password");

const $ = require("jquery");
const puppeteer = require('puppeteer');
const he = require('he');
var axios = require('axios');
var qs = require('qs');
var data = qs.stringify({
  'username': BakaUser,
  'password': BakaPass,
  'returnUrl': '',
  'login': '' 
});

(async () => {
    //GET COOKIE PROCESS

    /*
        This process opens puppeteer and logs in which results in getting login cookies.
        For Bakalari, you need two cookies, BakaAuth and ASP cookie.
    */
      
    console.log("Getting cookie");

    //Goto Bakalari website
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    const url = BakaURL;
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.setDefaultNavigationTimeout(0); 

    //Login into Bakalari
    await page.evaluate((User, Pass) => {
        document.querySelector('input[id="username"]').value = User;
        document.querySelector('input[id="password"]').value = Pass;
    }, BakaUser, BakaPass);

    //Click on login button and wait for page load
    await Promise.all([
        page.click('button.btn-login'),
        page.waitForNavigation({waitUntil: 'networkidle2'})
    ])

    let data = await page.evaluate(() => document.querySelector('*').outerHTML);
    console.log(data);
    await browser.close();

    
})(); 

$("#info").html(    `Username: ${sessionStorage.getItem("username")}\n
                    Password: ${sessionStorage.getItem("password")}\n
                    URL: ${sessionStorage.getItem("url")}`);