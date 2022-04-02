//EXPRESS
const express = require('express')
const app = express()
const port = 3000;

const dotenv = require('dotenv');
dotenv.config();

const BakaUser = process.env.BakaUser;      //Your username
const BakaPass = process.env.BakaPass;      //Your password

//AXIOS
var axios = require('axios');
var qs = require('qs');
var data = qs.stringify({
  'username': BakaUser,
  'password': BakaPass,
  'returnUrl': 'https://spsul.bakalari.cz/next/absence.aspx',
  'login': '' 
});

//OTHER LIBRARIES
const fs = require('fs');
const puppeteer = require('puppeteer');
const he = require('he');

//PATHS
app.use(express.static('app'));
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

/*
    APP Requests
*/

app.get("/fetchAbsence", () => {
    fetchAbsence();
})

function fetchAbsence() {
    (async () => {
        //GET COOKIE PROCESS

        /*
            This process opens puppeteer and logs in which results in getting login cookies.
            For Bakalari, you need two cookies, BakaAuth and ASP cookie.
        */
          
        console.log("Getting cookie");

        //Goto Bakalari website
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        const url = `https://spsul.bakalari.cz/login?ReturnUrl=/Timetable/Public/Actual/Class/2F`;
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

        //Get cookies and store them in variable
        let bakaCookies = await page.cookies();
        let bakaAuth = bakaCookies[0].value;    //0 is BakaAuth
        let asp = bakaCookies[2].value;         //2 is ASP

        console.log("Got cookie");

        await browser.close();
        
        console.log("Fetching absence");

        getAbsence(bakaAuth, asp);
        
    })();    
}

function getAbsence(bakaAuth, asp) {
    //Get request for teacher
    axios({
        method: 'get',
        url: `https://spsul.bakalari.cz/next/absence.aspx`,
        headers: { 
            'authority': 'spsul.bakalari.cz', 
            'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"', 
            'sec-ch-ua-mobile': '?0', 
            'sec-ch-ua-platform': '"Windows"', 
            'upgrade-insecure-requests': '1', 
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36', 
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9', 
            'sec-fetch-site': 'same-origin', 
            'sec-fetch-mode': 'navigate', 
            'sec-fetch-user': '?1', 
            'sec-fetch-dest': 'document', 
            'accept-language': 'en-US,en;q=0.9,cs;q=0.8', 
            'cookie': `ASP.NET_SessionId=${asp}; UILanguage=cs; BakaAuth=${bakaAuth}`
        },
        data : data,
        body: "__EVENTTARGET=ctl00%24cphmain%24ComboObdobi&__EVENTARGUMENT=&__VIEWSTATE=jIWqZb%2Fe5YdIzr6V3cairDAXrm2avzU4lxH8szhM0NClpwYy%2Bfdi6zXeTgYvqhKns9VMVkggCbfZGK0ftawX%2B0iGD6tE5REIl5jq52bExzRFhqgyCJKR4Hdr01QzH45LV4Cm2b5MVK3SHalkbZX7BEI8r60wU0bdOA6oAw5r7teeJ%2B5AGNCPCJpA5uW1CqFV18uyo7URW8o7ckDoYSZ6mcP%2BJaV9obu8d4dE8sOs69h0x7g%2FgdRKLT9orVX6bZ8NqSO6aLeXrlLORc11GQXXW4%2BRZHoG%2FEY9leASMKI4r380XMXXGwNgO4ep0Z1x145skJ55ge4F%2Fu6ibepHQF6%2FXcfpaP9MgFo935MqmBMaLSbghx6WLecTAv%2FTAVLzWc9PlubkAKQhibzJDPULb0YAndSY8QPmAi5Il%2BrUrXUF4GkQYy3bBGGqa62YfRHkMBE7Jsd0bNkA4eaOXZl1V1ysSR0UQ3RcOIx09PZNaonkUjCyKV0JP6Lpl1oik1NiZUOFHicZ5w2xrQyKCykIKHeYIalUWuNWxY7Y25Z0tD6bzD%2BzG5Anah9Y%2F98xGDcQErnUx4mvLo1jEeWVvJ9ysKv3aXOQN4%2FJxauL7wcgNEujUjPNkKt9aA4mPTOiHUOJpRON92TMNeBvvanzgpEreaOGXhPaCBd6MbK%2FxUDPBPyNzQXt2exXPQSOsDlyT9d%2Bb%2Fm5sWMVXbgxhfjeqxmTd9noekXTjO%2Bg7v2c4DcawhfRHSuabsFamZg8E%2Bi5DORyU6QS&__VIEWSTATEGENERATOR=AFF429A3&__EVENTVALIDATION=oe1UXBRKp8FzHBDbeaL2dZbMqIHDC5F5ZRcNGprgC%2Bi5LRjnkYGhfPmmw%2F6vcyOx2dkDjAMvKu3vJBTKqUbX9o49NhPNNwC1rg7SV%2FcLsCLnMf2XNuC5tIe06m7qrKAsMDaoq4%2Feb6nOHpizeebH3fcDpVGnzhfjOJIVemusEgOyJj4gSw%2FwLvr%2Bnedj9v6ykugpiVRR322ZJ%2FuGRr0JSFyXxJ3Ok7e%2FUd3bqMwoBAAS1NVk7o1k23qpyq3LZ36C&cphmain_ComboObdobi_VI=2&ctl00%24cphmain%24ComboObdobi=2.+pololet%C3%AD&ctl00%24cphmain%24ComboObdobi%24DDDState=%7B%26quot%3BwindowsState%26quot%3B%3A%26quot%3B1%3A1%3A12000%3A724%3A142%3A1%3A168%3A139%3A1%3A0%3A0%3A0%26quot%3B%7D&ctl00%24cphmain%24ComboObdobi%24DDD%24L=2&ctl00%24cphmain%24Panel%24Stranky=%7B%26quot%3BactiveTabIndex%26quot%3B%3A0%7D&ctl00%24cphmain%24Panel%24Stranky%24CheckLate=U&ctl00%24cphmain%24Panel%24Stranky%24CheckSoon=U&ctl00%24cphmain%24Panel%24Stranky%24CheckSchool=U&ctl00%24cphmain%24Panel%24Stranky%24PredmetyGrid=%7B%26quot%3Bkeys%26quot%3B%3A%5B%5D%2C%26quot%3BcallbackState%26quot%3B%3A%26quot%3BlYCrLiCSkYdpFPqVxmFfCAh94MQkYmrESGhfR%2B8i1EwRY5PmAuIA6NTr3qZn%2FnimDUKQibypoxXh8ly%2Bzq1H9m%2FkIsXzrXsJszgN2j0XPEAbOYlH4%2FuCmone2KT8uLvxip670465jky8FjeKOA9JCjJeSHWeuq1uDHdB9PvYBQTNpUWn9CNjFMQo7WfkCXfR1bebtfR4IbUGlNbAG%2FygIOPKCpLmPixvzAbY0L9k5boLxnhuRxqOxduhF9yXIdDm%2BftS%2B0mS6vGOCNIn3qWtPk70va7sv66EwHAYO3%2BCwWXBlEv%2BmUSi3E3%2Ft%2B49YLTSgVb5x2I61G8p6C8r71nBypcMng7n2zNPEYnZDtUgtj7QokQulRQPY%2F6v3ClXVTJbor9VUlsnsJr6T9vcuY23ymER7e2RA6HBvDupWKRAi%2B%2FykBWdJWgBm%2FRw%2F8q%2FMDFLWfdeupozWCSK8ZU%2B6v20jC6TciFbvZcLNc%2BM%2F1KZf8quKPezWDNMRZdDkN579V2ZLHSlZv6glnnf%2FlBFHaIu3fCtcQbPQwupMNuqTxBKZTImGC3N1YloskpNuMOF7%2FHpdyvuz0Meo%2Boe55Mz533GtoVUPWfbhCE1TxSxR3MFRq07gFX2D6uAn37IGoXCB0b2bEryOtg%2FqY8xzqV7fRs3DuzAUzwR5eLL%2FbjpY4vLtH%2BWZ48n9BG0icDeTJ10nV%2BTsjl9xn7cT46gHir%2FNz6Tasjd5mh7x5T6A5CVXhlcH8X10Qg2Fq4DiY2PODWQp2s3rNxgCcYhv9fEd7UG2Yk9OPe51ZiMaVaOXKqZYp0C9M6vjBzmzOVSfx9SRHpbFqeyksbuer0EsnvjGGenffgzC0VU7atb34YQ4M2sSMgeRlbaU96CWiondHelJ3Lxrxc4MUDRLHQdDsWgSld1uLs%2FEqqCN1%2BiV7qa8Olr3jFTGLyjICaRDAwFagu6gbdw6hGBGfUNhNdD9rTzbCDTy1HitJw3oMPE6S5o4Vv%2Fe%2F%2BxtzF7WGmeybvDl%2FTEv0hzU%2FoVXYmcAXxuIP5y2dvXaPH5B%2BuAybnqGY%2FBWybnA4Dv8m41RcAvIln10yUFfmcMSqGQwyrEsgevPVQALwv1cTc3LB6R8uFUbJjNUO88qvTs6AY5KPeMamQE%2F%2FaFW4dUDdoRV%2FVGopjf8R4a%2Fng7RJ5ic2HzZKYO%2FwB0R82cArQvERqdk%2BpC86sFGwtFsHsTIpCEfrfzwgJ4XkBYnultZjqUPQx0al9wNKBHf31PVnLXm2Fd9E%2B7afmUE%2FZnehENHHP3ZUSP1BuencGVKrczCSp6zTwYJDTfnDbJZDvmJymguSU%3D%26quot%3B%2C%26quot%3BgroupLevelState%26quot%3B%3A%7B%7D%2C%26quot%3Bselection%26quot%3B%3A%26quot%3B%26quot%3B%2C%26quot%3Btoolbar%26quot%3B%3Anull%7D&ctl00%24cphmain%24Panel%24Stranky%24AbsenceGrid=%7B%26quot%3BcallbackState%26quot%3B%3A%26quot%3BFLDS_CBDEL_spmym19p0py3c853hFbwOpft%2FcfTgY5wqQ4OpQuOyGCSNnLHjIMTkhwAwHDrlgYoHiVf%2BSGb85NCIQRZxGCPkZNqdl66ZKb7aUkOwI1x2QOBRsmgYXUsKlQ7JzPwxkDNGalQwnZoKyFh4RMs%2F6GfFP4L5GavVxjMVHeN96%2B7WQgOnqHELoz%2BSGI1hkgFRzar4jNs4VwTyrBNUdwTnXsvtq973ShoqJokuXdp2tywfcw8tWa8y1kOlsZKKW5oHN5mlylQmKKc%2BKmDWcPkqDZVSKvgwXhmgSNeJG%2F714Ewo981r19NnlXkZx2Az1yi0v%2FuLtq3Dy7PsTVRmGbnIMw0ZRL%2BmRAPEn0TbVlt%2B9FuJIYgPf5AePlHAsicLeWVS3kI3RyCHZ10qlzJ%2Fa%2FEMjuLze%2BoSZ2nl5ZfOcwJP8pmNb6hl590sV%2Fkh52ZDgyrh7fIFkRLT63zHCtRxEVOn2XomqCu0D5O0p%2FnnI0aSYZeoP1nzK7aZ6Ftvk1Awsy%2B9ZKh3tVXHrCLWmDHHB4c3nWHkdhTGcpNc3J7beWmI1bwMyhZqlEXDXJTEgBt9p5ZrhjAJ8SELzGoAm%2BiimMAJQFtWjdrOrrOjM1%2BGrYAnLYJPZ68UKaAsYUiTtMtZiRLhl4bFLv5A4u65oHGh6p0tsZ5hw%2BWKz7QyvMud%2F%2F4YieHW5YgydXglUOlVIcbMtq%2FxSbG2hRlMqeg%2BarXtRlVs9iDN0ZmNtD5KBDy3WkeX%2BNIFjtYdlwSfA3EKPuyw5gZtsYqFtCL7BXVnpVYze%2FMxTxRNL9lM27VRvAw%2BCeCQO0QKPd9q5AEie3FxGqrdQNgcRKUls%2B7JfBGNdcNSVxuQ1dpQSLbd5VfjlEJtF3wKKQwStYKanwoODa%2FpTJOSMBP%2FCdVXrVQsODSIGhx3iavHo1cZq8H0%2BSl7zP5fV3nfi%2BY2oIyzDuwSl5dUkLNwQe9dRvheO7ZOcOvUKPK7vpdRBELZZR7oDufv5jER4LN2uL6xsl1IckRBiZ2M0xU8rfJIfQPvF7YKqivL9U2A1iGp1AmZtkn327i7Uxqxv9g7tb0qFm9DxaPEcYZx2LCTVyQl%2BpjZVRcTu74kGHfueg2yBKCwzJ5jK5PzhpM%2FQn%2FOcLEm4cPyNSh2BxywCOU2cgOnkDKnDiuZ7XC4V4Llxi%2FInXpZiQ%2FT%2BJd7ASbeWUld8KPwtG7NAowcTWSiJYXQcAUNdk03T0eY%2BxZCQ8VKZPOKzuGzS08Stj6m0xnTlTSkcGj1UncNdmDI6mXhPTcdSPkrzADOPEYsHwK8zLsTYLQKvYHP0sxzlJV%2FpNv2FpfwUHm207lk4573qgDRMcwDLWunqc%2FqVzPAIrrctp3xZLWx8VhJEoylVBCyaW7BNd%2F5T9Ii%2FTNEnrKvxjDKCfiNt9%2FKHBDKsXuJRB2HSBUWsAVx32wY%2FWSDUq0SaRa2q80JhASpJwfSe8tjhCFjc%2BizGqkoJVngXJMWdz1s6h4Op5Fj%2FqLXAsVLZswuAqPdSVmh%2FXNtr5c9fWHejkCSL8PfPgXtwSlSG3XnNOrdgB84P%2BcoKSDl%2FFPJpNRRdVOiTOxPt5E%2Fyxgx7aqr%2BWIVaIimeXhVyTXab8vxK0azQYatE2iVsLTewjhEwq5k2d7Gu8%2BGqUO%2B5W%2BIZnOpTjAmdVJVk7PHMgdcgJCk49UpOpXwfWdmfcXzs1h9OFlXhDmWactbcxPUF9Z%2F0u0p%2BKsu6un%2Bxe6BXqtz6VYi5yzUHZYkHblgWmLc7Ggnaana5B2YLRHNH2KB0XJLnVW5XI7PIYlgNHVYLLIjLQKwbss1SJz1P%2BcmneB1li52IqntH6GG5WPPh7wMlv4apJJkdhJ1%2F7LK0ypmassGR%2F9aVGIqvSM9xBBk5PILOt5Ou7LsMaMzayeGIGYi9pgtnFNAT1uIshiLdH4ps4qF24JWNqk5P02zrqBx%2FAXMLam%2FBX8YZPIf51KgohY3vAaLiAxBxvYfvsKkQ4ebSLiN0X7XF5rfjxqQmGeB5BOBgYLF5EByXyl3WBvvHNaZWVN6aHX%2FybaC1%2FQghoDy5aZD1EAtV1LPxydTfA%2FCh%2BprqLbwXD%2B%2FTlur9%2FRA4vY9Rgy0y888bLuwjbKoQt95hGh17q%2BZ1azBc2M19LbJC0kyWglQ5T%2BLYEFFIDWWXc268Sf0XM98uj2EsJMTayqvnkOxbeoaAFf%2BsBhsJYDtvLp6v8OISOrCKlc0EbnSujqeiamkMVR79HVq2MhLOAz0UH7%2FKmYh6uo9bu8aB%2BJtLuR4LZWZpnZlSX%2FN82uxXoYs5OAoClKT9y8l3rSN%2BX2V9MQMvpNvJJLsN2S6DMggbMJgHZq92XtOzFzCGnXWXRg7dXf85vZje3dhhHbbvO41Q7pAz0fWfUIRIIH9bso6pLOxPiUpgpSco2%2FAB2wRhpLbkWL9sydEYuqYDXvqx%2FzLoUrdTcmroF9dIqKVo0zCpTs%2BHbOjexFlIis3s7VSWBu%2BX%2BD4sThi2CH%2B0YP9cijAOy61E6woju%2BhVWDGfPTlD45JuKiPASPSpRSM6yJkurjPQiCmtMfoMcFQcDnJ0OyjL6qjKKyUIrnqaAlikm0DMgc5gt9lMRAj1o8AYTRohxOzUEq9PQoPUMN1qoblPhCfVL3TDMlycoq0teyqsqM5k5dHolcDKaVCSSQnjFjKNPw15gtzHgthHv33cSgZYHysZOXG926HnXgwQMQ%2Fv1lWrMxJqPyWAUiS9HoHyBKopzh07OZfDhhIV8ydh%2BOKGQTxwTXnBjdsIStGJ8ldD1PNhBT0iyAEh4353Kiud3QkQfzVlUNGfbhXHSmIErq1PNf4bp3dL6sJMYkIw3izlmgGJzJ1gMsOwJjcbty3H9LB5hXNB8Py6AckMjNzHJa%2B%2FivGAPCV5fJwbONXDmXa9B8Ni7KmdRoNEq0KzTCfx4CVw8Ipch656GBu6wdwadYsM5oF%2FDMIMbtjC90vNB%2FuA9ZybBl06JZjLGa5gmiUILOAYUOQluV%2FqPLgEVu8XLPATTq1DtviAf7u%2Bx3PE0UmSIexJHQWYEukv8X2LTUSWRuB4f5YhejBB3P6aYFnMIbE%2FDcQ9nrbD2N0xaJ%2FxeNT2LKGaU2iXfzAtXw4PcV%2B0Z%2B%2F5CHaT16vfnAR7%2FlbjNZFdGtbUMGbkBgVFcZL%2FJI2fz1G2PNPkhvpKK17iEbDtlnGX%2FAwKmNCVoi5FKkvo2aCPbWJd8qoJ0zbD56M2y8ac3VCzyAff0Tx4EaJrm5suaPqnqRpwUVoDS6q%2FKuhG8H%2FlqiVpUMludXwDbwbGom5st8b%2BSqywePeXQojwanmnBCufB2pepCq2Nil1%2FLYJ%2BA6GFbKkPBy4LmTifvKSfDd4UEuT%2Bd3QE51y1BL%2BIzHnp8JXpBaiUKgbC8lu6uc6u1wNYzSUb1XCHywdIyOjjPr3gC7OMgcBuat0yUzH6Ilw8QVhBZwjVU5PqWOGQcK3cMPYQ1203LM%2BSmyHgUa4BsP%2BkGO7gWhfzF1uVzgluBnEcj%2FZLL%2BBb1x5fbLTbmnyb73LjB6%2FLSmVW4OxPlb03JHGWFs6kmIFOqLdYMBgbVbgAvMdl4NEyg7skupyLkdKJdmB0RVjk0DWHt1tawWnWwwL%2FM1VSkpMA7w8xW6BNwOC7ORxo8wNi%2BplTbTLmDFE1QiPPO6qkr1of09wQsy5NyIUFH1y4IgGhh2bucwEqdS9HXErrAkqtEfweDGTCe7HguMlRBqNwiSFCIwr7sDeFTv%2B%2BSDHtSxBa5oo9tFxLAMGEVPUN7fL5QWV24xdBXdCHjcA4qvcGrDoVf5DAEEOArOx4KqcTvdSlSL2t4PlzmkFZ66mNWdaUVjorUQb3WJ4bOx3ujUIj2iCNz%2F4ZPMcVWo0em%2B1Nazjp9o4InFTrRv0P6OaRvA55M6UtAdapwczX0dODEkgysbGH0PTSK7GLq4r6ztWYYDDaNFbCfgBV7KiSLeswDBSVb%2Fzs2gPakHWCHT%2FgB%2BlWwhKdGCelF52uvo4aqGLR72GOnZAEDs83Xufb7Fmwd00hTCMcJEXPltm90atiejQNjJhwhMHxe4F7pltLLTExGBCBk0HMyv8kBrcbQSF3OJ3RW1znNpS2RV2FIGQeP5wRV%2FEjLZ0IyD3iBER%2BhZUcl8Q7PCxDKz%2BiY204usPFlbDrOEjQyAJkc3oFM%2Ff59kMWznccTk5dmaunPhzjWWlDfdAml19ImG593X8ow0Q6xGFAdwAKdYtODDdkn5KZ39QTs5l%2BvBpCIa11tXESUaaYw7eZaPfhxAuC07eLmaUltl7hKGDdfmIS0pSqaQQn1Vixdp0fkrExnacoKZ2CQJx5eRGDioQ%2B%2F3%2FsUqKlH4NLlvYUaOUd4xnJWgRc2E6ilAYJU7z6czdIa27upysjDrxSqFpa9utfayS%2FLMpVJsCAPAoSTI7K5hkJZ%2F2gLqyIauZbZtAVunv6FCCj9EKOD8Se5yF9gQxc1BMFWyDjYFd71iTyM1wvJePxa%2B9clOU1OPZED35iyB%2FHIr%2BJ42Ql4a4Gwdm%2BjSlass0eJcWwQl3QVb%2FljB030SPhx93lqTKlkU5q3f9yJUQ3A6VBMSA7XfB7eJdmG1gXtKXdyT%2BA3yclOPZFybvpojA1hS%2BTTabEompXihJjESHATir4U9ZOfM%2BGJvaMXUu68SUJtwYafQKaF8UhZ4I8EO63Q5DD6gRgKSOgFS1tzUpaGCltrbRPmMo70pzdw8uBkYkhVNzIf3qC%2Fr3JQ%2FqLs8aLBbVfSjcwTtaSIdTtRS0FzNOnqCZFinQqYCVAmhPU57sbM1ErKme05QvS1ieeWEIslpzonTJDw9YNVK3w0ufWoQnNvRXOKtGBGxBfmBqSA%2BMipv%2F2tcxwmi1BiNa41wONWik4YGT3XelioluUL%2BVAIjeqmcpsTymlhW3u782ay48n0SnGb47naH46hCL%2BssXERwnzU8TnIs8cGzPhCQ2jYxCtvKTl52cVetcyB8RzsV6vcymoYsUXXQZPtjNWy3KoXvJEHOcMXd5tcY5vgK%2BWEf4YCSvKKJTTJUa1ROiLVf%2Feus1gzvHxjda%2F9qTIbqYWd9YbPan%2BnO9FEb8tYQHCbqMAjEtR6pkqBDT4zN1v5SSUzVllViUDQbtPKKsqGesOfonkX1KNW%2BB0wKT6dAplj9QC1%2FA1z%2FBRILyyBXxr6dj0XBN8GoJ%2BVgnesxJMOk%2FWVJq8qjMwCxLCZhVbuFOz676B25TXgiB304iecukqqk6pAqRXpu0Fap90EgU4jzO9AW2O62llWZ2Oru6Ow1%2FdvLOLQf49OQBnWHKNsgtQWa8Mf%2BQAtTbLyxd9IvXMHrGYyP8fqucUulMrM80XsyImUqbYmV%2BDF8WzPpnEYwJu5CQAZnTPhjxhzI96ROC8VJdHTZ0sY%2Fvt2dDuoechpBHwdWfmpJhhsOR%2Fe47Z20FRBdcjNLM%2BqfRE%2FTR9F1gOeHT46rSVTYd26yq1AMGJxNAh7Ye3ygcy8Gq0kGVJnQfELHs%2BQK5g1MhvUnNziRcZF3EMfYMFC%2FePcNJnVsuUDZUn0znNIWlzrbTb52CNjEcHAbFqMvTxC1hMfP%2BC1kYR8XCL86Gf7XhZHQ9TzAvPjg%2FxUdH%2FfQNTN9nNZydLulw4XEWF24DB5JTK%2B%2BPdLNFcwwzE8qDo5C7F0Zv6AGAbvQrnEgkR5NMh692Tm60K6trMcyVnTTSzfGSToXEZrTLN0Otw0BTuefqYpkhSfdrj1V0bwfzUC%2FDZszx14TeXVv4Rdn8yaHgTryJXt%2BRimY8qRb1IoetJNu9o2742XwtGcsQHXmdpeU73AgISBjjiGprzGsPMyPIdQXw2EA7hRM6S9cIGJkc1nz4%2FeTItOKanXN49jVmAV%2F8omk9fP%2FtjJsB6JQXaH6saBTxBdeVa6x7FhXuzKuipYblQANvwsSlBnBtY9s%2FigDhhdL6rxTYh8pdbkuynrqCvsJ%2Brsl%2BFXcJX6LcZhoQnULLnMR7jQldTzr0gu0uAbSdSTdlpQHeRA7o%2FXl7LIADH%2FN4OjNNa4IjF%2FJXB96znJcdPrLyYn6jNteS06QaxbF7NAFUQVORflK52FG2cuGKRGX6vqa99OqRS6mJujejOgKN2jJzZcY0EgSb2bsAGy%2FLto9TjeNnNadheHUMcNegOChObXoPbnKz0LHAt%2FH3NFGRHfJiBmhuQcYgovmLq9DFHwvT8tFMMNQR1fZ0bIizMNdLqLQ2EptVYJ1Oe3PTFt817jdWIW6%2FOqq%2BjVYIgtg0WPnQPnJbY6xjrSkQQsLXKCK4XOqI6L09c7e9U1fFM34j83zUF0csqvrmgEOYf91x%2BtmW3hNuq24HRFoJqduaJiMVqn1Nj31ziYa5LL6JWGYbMJaGUv8Cs5Yq9yLScfAfVVVX6kQhR6PtYfsia8VH33ZZ6BwRvUftiMk5lJYHOmSt8T3srA05ciENI66Bco1AfKHI4kcxzbxGQb1XvIMVyfeEee0dctm%2BdwZUhWb%2FEuQpQ825aLe%2BODa672BZC%2Byls8FgoaMioZw9OvTW6k0ME9eu1bZgu5%2Bvqq3eBpShmR7bbYuqBbiwMvaweWF0oyQWXPHkk6%2FfkGcZJcjKUP3elYUn5Ueu6emeUyI87sIsqz0zajID0EOBluPFUj6oOM1QK7FgQay8M4HG3sXW2EMaihM2NmBZTFhUVa8qaiaUJqs5cYYXBSKPdGv6yy2mpEyZbQLaUmdn705KZfz6X7Tjsrsyrh91D%2BA6Quhsa98CHKzxo9DVSBgWVgRPB%2BIH0nJjd5Mqm1tf4P%2FNiyvP1aWNvWyjCkx21iVm9urSTTyTBDIHgoKyoQ_CBDEL_FSE_CBDEL_76Tac96S0fPSQ05F7BTbMAFXPSh7GcOe54DanhhVUN0s%2BNlA8iUDKLeldV7MN4qXUgeZGps%2Frblkzs3wrojxkSKzmnvIW5cJUAeYMf2p0pw%3D_CBDEL_FVS_CBDEL_2sivb4qc66MI7T0YWNOwOxWTmdzBkIQrL8JDRzbfVci0oRJzTg%2BKRnmYLBBS%2FISg%2BU9%2BdNpyaRBVemolwyiB22C508VjHRXJPKkcGjpZPh%2BRq%2FTuJ%2FntuyoHe2j3eP1fzyEOVAXsw%2BSVYjZQJrQeDFqapDfwb4UKEQb6Fz6RtV%2Bm7UbR8PklmyguiB4pZY21ufaYXDnI9e3NBstt%2FpNps0uF4q8crVWkV%2FrjapKAEegBlJuiCsjATs5S5mPCdzq%2BWfu%2Bu3cjk2shauGN5h1%2F01NxOg84JEKHloFwqbsZtu2QHes6XnBqABQqT%2FyKBFqKMvcptEzO2l%2Bz9bQYs8XTEQ6KiEGqSNVU%2FfRXzEt%2BXemxhY7D6RIIVoplE5yoRUGNNQsct66TUM2ig%2BE3UGilU3pTxCx7h0LuA1VEKuwEmJ1wlU8Ynkpo%2B2sQ%2Bok82dfYh6AX8uMY8PPMvMzskyllR%2BXTSO6jf9JH2ZURejisDHg%3D_CBDEL_FVSE_CBDEL_FmrX4YSj3LUSBfNF88rITe3hYczvPOiOC3vdVHarHeUjDkU%2BuUwGTtYQf2RGiUHd2JHgzx331K97hyPW5lnarQ%3D%3D_CBDEL_OLSID_CBDEL_ZjNKx2QfXJoPct7YqV25ywLchGMBn%2BqQm64WnztIDPeKF1vwblDlFnRDXanq2dACHsc2S5StWZ7%2BArWlRRiSXw%3D%3D_CBDEL_FITEMS_CBDEL_lE75VQyp8Fs%2FCN6x6KNqM8IUkjGjq4wtpSzqTT79haTlQDpGWmCngwYJIQFT6SxDA%2BTTgQiAUItBIAe8%2BnVSY7A4ls%2FiGePRcpIS7GNQx3%2FkXDXdSSYR%2Brq%2BfbQi47ox8%2FYTPUxsqtgtT7ny4jOSx4DAKLxn6BfqgdIPSBK2yDLVvjp7dunV6sQTHiSTYOalAL62%2Fk%2F5LXNIscrF8DnHBGtDCGisygSkjNka3dCbfjZtcQincEUlgEvnHVJf8kQAvOZEbfyP%2Fv%2BEh8KJL2Q%2BmSAClNvUU4nnIIfZFOnX4PKvYFEr7ZXk2TW4EAmElJX%2Bvr4df7jdh2lVBBDTWz3K1tblOMFoaeT3A%2FBWxAJi4hepWorEY3ao%2BhyhkMgf9%2FW1vwejzXn9O2YZipX08%2Bt2AS1VL73PD4tceyMJ4sWXiodhoGAYikS5mRG06OU%2Fj3i4luLa9hFUn7AVMGEBx3cFzh2fldT9U1w6JF1TACEHtOw14sthf0eBs4LNfFPixouVMJT67rGVhVcf4HwLgAgx22HfcioXVXKxE5mP1CtwXyX1GJ05rCShgRWaqAoukwXSI0s165UsIDUnQa35jZQ6slW8%2FsSFR3Tk4ZhWszWb04eoVfXN3xZRFGfoMPTYnsliV8ELVTuNOD6ZI5P0XzXdPfQXc2KNC21FSyBcrPwIRfJtwUMDBOA68%2FA2uqxmtUhxhlrh5W%2FWqIz3i%2BHcRyOd0Ro2SaIP2ttddzlnTqZPalWKUz4E83v01OwyY6j1X8oD_CBDEL_DSS_CBDEL_tDvANkBupW2rifzOdh9Dx0QK%2B4esNGlRGcUyVaVjzlYu3iUZGNd2VbA8aCRiTje7dpGfTh7yAUSUH5WM34xDkYTAc2i%2Baa2jWbbIEorG79g6KvYzlOlLvz%2BP7Cv6SJtG0YWLWip%2FyA9LPl1afd11VCxZu4BjpcPBrWuWVsvcbPrFJM00fW%2BLjbEmnzYrBDJ0_CBDEL_FDT_CBDEL_4Ff74UMURxLyGXY2dP77mKwIazmwYOF7W09g%2FiLyOmnwU%2FOox5qCt9aG61I1XTtd1hU95vvEs97AEDAB2RZQTXd5GyDDtx%2F9DbdsGpCtFUY%3D_CBDEL_%26quot%3B%7D&ctl00%24cphmain%24Panel%24Stranky%24AbsenceGrid%24HM=%7B%26quot%3BselectedItemIndexPath%26quot%3B%3A%26quot%3B%26quot%3B%2C%26quot%3BcheckedState%26quot%3B%3A%26quot%3B%26quot%3B%7D&ctl00%24cphmain%24Panel%24Stranky%24AbsenceGrid%24FVM=%7B%26quot%3BselectedItemIndexPath%26quot%3B%3A%26quot%3B%26quot%3B%2C%26quot%3BcheckedState%26quot%3B%3A%26quot%3B%26quot%3B%7D&ctl00%24cphmain%24Panel%24Stranky%24AbsenceGrid%24DXCustFieldsState=%7B%26quot%3BwindowsState%26quot%3B%3A%26quot%3B0%3A0%3A-1%3A100%3A100%3A0%3A-10000%3A-10000%3A1%3A0%3A0%3A0%26quot%3B%7D&ctl00%24cphmain%24Panel%24Stranky%24AbsenceGrid%24DXHFPState=%7B%26quot%3BwindowsState%26quot%3B%3A%26quot%3B0%3A0%3A-1%3A0%3A0%3A0%3A-10000%3A-10000%3A1%3A0%3A0%3A0%26quot%3B%7D&ctl00%24pcConfirmDialogState=%7B%26quot%3BwindowsState%26quot%3B%3A%26quot%3B0%3A0%3A-1%3A0%3A0%3A0%3A-10000%3A-10000%3A1%3A0%3A0%3A0%26quot%3B%7D&DXScript=1_11%2C1_12%2C1_23%2C1_63%2C1_13%2C1_14%2C1_15%2C1_16%2C1_20%2C1_182%2C1_204%2C1_181%2C1_183%2C1_184%2C1_21%2C1_22%2C1_193%2C1_202%2C1_187%2C1_185%2C1_189%2C1_197%2C1_17%2C1_41%2C1_198%2C1_199%2C1_200%2C1_192%2C1_191%2C1_61%2C1_194%2C1_188%2C1_212%2C1_210%2C1_239%2C1_249%2C1_19%2C1_223%2C1_224%2C1_211%2C1_217%2C1_215%2C1_218%2C1_219%2C1_216%2C1_220%2C1_213%2C1_221%2C1_222%2C1_226%2C1_235%2C1_237%2C1_238%2C1_225%2C1_230%2C1_231%2C1_232%2C1_214%2C1_227%2C1_228%2C1_229%2C1_233%2C1_234%2C1_236%2C1_196%2C1_40%2C1_190%2C1_203%2C1_201%2C1_24%2C1_33%2C1_250%2C1_195%2C1_34%2C1_39%2C1_8%2C1_48%2C1_9%2C1_30%2C1_27%2C1_31%2C1_54%2C1_53%2C1_55%2C1_46%2C1_47%2C1_52%2C1_51%2C1_60%2C1_42%2C1_32%2C1_59%2C1_57%2C1_56%2C1_58%2C1_49%2C1_35%2C1_36%2C1_50%2C1_62%2C1_38%2C1_43%2C1_44%2C1_45%2C1_65%2C1_37%2C1_66%2C4_0%2C1_18%2C5_1%2C5_2%2C4_115%2C4_98%2C4_100%2C4_99%2C4_101%2C4_102%2C4_105%2C4_108%2C4_109%2C4_107%2C4_106%2C4_104%2C4_103%2C4_110%2C4_1%2C4_34%2C4_113%2C4_3%2C4_31%2C4_2%2C4_24%2C4_22%2C4_23%2C4_27%2C4_28%2C4_32%2C4_29%2C4_35%2C4_47%2C4_48%2C4_42%2C4_80%2C4_36%2C4_37%2C4_38%2C4_39%2C4_40%2C4_43%2C4_44%2C4_45%2C4_46%2C4_49%2C4_50%2C4_51%2C4_52%2C4_41%2C4_53%2C4_54%2C4_55%2C4_56%2C4_57%2C4_58%2C4_59%2C4_60%2C4_61%2C4_62%2C4_67%2C4_68%2C4_69%2C4_70%2C4_71%2C4_72%2C4_73%2C4_74%2C4_75%2C4_76%2C4_77%2C4_63%2C4_64%2C4_65%2C4_66%2C4_78%2C4_79%2C4_86%2C4_87%2C4_89%2C4_93%2C4_88%2C4_90%2C4_91%2C4_81%2C4_84%2C4_83%2C4_85%2C4_82%2C4_15%2C4_16%2C4_17%2C4_18%2C4_19%2C4_20%2C4_92%2C4_25%2C4_26%2C4_30%2C4_14%2C4_6%2C4_8%2C4_7%2C4_9%2C4_10%2C4_11%2C4_21%2C4_12%2C4_4%2C4_5%2C4_13%2C4_94%2C4_95%2C4_96%2C4_33%2C4_97%2C1_271%2C4_114%2C1_64%2C7_7%2C7_5%2C7_6%2C7_9%2C7_4%2C7_10%2C7_8&DXCss=..%2FApp_Themes%2FNextBlueTheme%2FBasicstyl.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FEditors%2Fsprite.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FEditors%2Fstyles.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FGridView%2Fsprite.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FGridView%2Fstyles.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FHtmlEditor%2Fsprite.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FHtmlEditor%2Fstyles.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2Flayout-elements.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FSpellChecker%2Fstyles.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FWeb%2Fsprite.css%3Fv%3D20220217%2C..%2FApp_Themes%2FNextBlueTheme%2FWeb%2Fstyles.css%3Fv%3D20220217%2C1_73%2C1_67%2C1_68%2C1_69%2C1_72%2C1_252%2C1_251%2C1_83%2C1_209%2C1_206%2C1_208%2C1_205%2C4_118%2C4_120%2C4_111%2C4_112%2C4_116%2C4_121%2C5_4%2C5_3%2C7_13%2C7_11%2C7_12%2C%2Fnext%2Flibs%2Fbootstrap-collapse%2Fbootstrap-collapse.css%2Cimages%2Ffavicon.ico%2Ccss%2Fmain.css%3Fv%3D20220217%2Ccss%2Fmasterpage.css%3Fv%3D20220217%2Ccss%2Fheader_obsah.css%3Fv%3D20220217%2Ccss%2Fheader_barvy.css%3Fv%3D20220217%2Ccss%2Fcolors.css%3Fv%3D20220217%2Ccss%2Ffonty.css%3Fv%3D20220217%2Ccss%2Fjquery-ui.min.css%3Fv%3D20220217%2Ccss%2Fnoty.css%3Fv%3D20220217%2Ccss%2Fbubble.css%3Fv%3D20220217%2Ccss%2FDXGrid.css%3Fv%3D20220217%2Ccss%2FcustomScroll.css%3Fv%3D20220217%2Cicons%2Fbaka-webicons-modul%2Fstyle-modul.css%3Fv%3D20220217%2Cicons%2Fbaka-webicons%2Fstyle.css%3Fv%3D20220217%2Cicons%2Fbaka-webicons-20%2Fstyle.css%3Fv%3D20220217%2Chttps%3A%2F%2Fmaxcdn.bootstrapcdn.com%2Ffont-awesome%2F4.7.0%2Fcss%2Ffont-awesome.min.css%2Chttps%3A%2F%2Fcdn3.devexpress.com%2Fjslib%2F19.2.8%2Fcss%2Fdx.common.css%2Chttps%3A%2F%2Fcdn3.devexpress.com%2Fjslib%2F19.2.8%2Fcss%2Fdx.light.css%2Ccss%2FNextBlueDX.css%3Fv%3D20220217%2Ccss%2Fselect.css%3Fv%3D20220217%2Ccss%2Ftabs.css%3Fv%3D20220217%2Ccss%2Fabsence.css%3Fv%3D20220217",
    })
    .then(function (response) {
        data = response.data;   //Store data
        data = he.decode(data); //Decode data, that means translate html characters to normal ones
        data = data.split(`<td class="dxgv">`)
        console.log(data[1]);
    })
    .catch(function (error) {
        console.log(error);
    });
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})