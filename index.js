const electron = require('electron');
const $ = require("jquery");

$("#btnLogin").on("click", () => {
    sessionStorage.setItem("username", "jankubat");
    sessionStorage.setItem("password", "4Ajs0E8M");
    sessionStorage.setItem("url", "https://spsul.bakalari.cz/");

    window.location.replace("dashboard.html");
});