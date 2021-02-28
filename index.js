const axios = require('axios');
const WizardScene = require("telegraf/scenes/wizard");
const Stage = require("telegraf/stage");
const session = require("telegraf/session");
const express = require("express");
const {Telegraf} = require('telegraf');
const { catchs } = require("telegraf/scenes/wizard");
const puppeteer = require('puppeteer');
const cron = require('node-cron');
require('dotenv').config();

//Express code here
const app = express();
app.use('/', (req, res) =>{
    res.send('Bot is Working Fine!')
});


// Bot Code Here
const bot = new Telegraf(process.env.BOT_ID);
bot.use(session());
const userDetails = new WizardScene(
    "get-user-details",
    async(ctx) => {
        await ctx.reply('Please Enter Your Full AUID')
        return ctx.wizard.next();
    },
    async(ctx) => {
        ctx.wizard.state.auid = ctx.message.text;
        await ctx.reply('Please Enter Your Password')
        return ctx.wizard.next();
    },
    async(ctx) => {
        ctx.wizard.state.password = ctx.message.text;
        // await ctx.reply('Please hold on i am procedding your request');
        try{
            userFetch(ctx.wizard.state,ctx)
            ctx.wizard.next();
            console.log(ctx.wizard.state)
        }catch (error) {
            ctx.reply("Something Went Wrong!");
            console.error(error);
            return ctx.scene.leave();
        }
    }
);

const userData = new Stage([userDetails])
bot.use(userData.middleware());
bot.command("start", async (ctx) => {
    let user = new Object();
    user.id = ctx.chat.id;
    ctx.scene.enter("get-user-details");
  });
  // Main Module
  const userFetch = async (state, ctx) => {
      var loginData = {
        "username": state.auid,
        "password": state.password,
        "usertype": "STUDENT",
      };
      
      let headersConfig = {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            "Access-Control-Allow-Origin": "*",
            "Host": 'api.alive.university',
            "Connection": 'keep-alive',
            "Content-Length": '70',
            "Accept": 'application/json, text/plain, /',
            "User-Agent": 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36',
            "Content-Type": 'application/json;charset=UTF-8',
            "Origin": 'https://alive.university',
            "Sec-Fetch-Site": 'same-site',
            "Sec-Fetch-Mode": 'cors',
            "Sec-Fetch-Dest": 'empty',
            "Referer": 'https://alive.university/',
            "Accept-Encoding": 'gzip, deflate, br',
            "Accept-Language": 'en-US,en;q=0.9',
        }
      };
         async function loginAuth() {
           var res = await axios.post('https://api.alive.university/api/v1/login/erp', loginData, headersConfig)
          if (res.data.status == false) {
            console.log('Invalid Credentials')
            await ctx.reply('Invalid Credentials')
            return;
          } else {
              console.log("Login success")
            await ctx.reply('Login Success')
            return res.data.token
          }  
         }
        
        async function makeRequest() {
        var loginToken = await loginAuth() 
        var res = await axios.get('https://api.alive.university/api/v1/user',{
          headers: {
            'Authorization': `Bearer ${loginToken}`
          }})
          var userData = `AUID : ${res.data.data.session_data.auid},\nName : ${res.data.data.session_data.student_name},\nSemester : ${res.data.data.session_data.current_sem},\nInstitute : ${res.data.data.session_data.institute_name_short}`
          console.log(userData)
          await ctx.reply(userData)
          let headersConfig2 = {
          headers: {
              "Authorization": `Bearer ${loginToken}`,
              'Content-Type': 'application/json;charset=UTF-8',
              "Access-Control-Allow-Origin": "*",
              "Host": 'api.alive.university',
              "Connection": 'keep-alive',
              "Content-Length": '70',
              "Accept": 'application/json, text/plain, /',
              "User-Agent": 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36',
              "Content-Type": 'application/json;charset=UTF-8',
              "Origin": 'https://alive.university',
              "Sec-Fetch-Site": 'same-site',
              "Sec-Fetch-Mode": 'cors',
              "Sec-Fetch-Dest": 'empty',
              "Referer": 'https://alive.university/',
              "Accept-Encoding": 'gzip, deflate, br',
              "Accept-Language": 'en-US,en;q=0.9',
          }
        };
           var res = await axios.post('https://api.alive.university/api/v1/getrooms',
           {
                "org_code":"AGS"
           }, 
          headersConfig2);
          var rooms = res.data.data
          if (rooms.length == 0) {
            console.log('There is no classes for you');
            ctx.reply('There is no classes for you. Enjoy')
          } else {
            var scheduledTimes = ""
            var subNames = ""
            rooms.forEach(async function(el){
              var roomsTiming = el.sTime
              var showRoomsTiming = el.start_time
              var subjectnames = el.subject_name_short
              roomsTiming = roomsTiming.substr(0, 2)
              console.log(roomsTiming)
              scheduledTimes += `${el.start_time}, `
              subNames  += ` ${el.subject_name_short} Timing - ${showRoomsTiming},`

                cron.schedule(`4 ${roomsTiming} * * *`,  () => {
                async function joinclassModule() {
                  var res = await axios.post('https://api.alive.university/api/v1/join-session', el ,headersConfig2);
                  var startedClass = res.data.data
                  if (res.data.status == true) {
                  (async () => {
                      const browser = await puppeteer.launch({
                          headless: true,
                          defaultViewPort: null,
                          args: ["--no-sandbox", "--disable-setuid-sandbox"],
                      });
                      const page = await browser.newPage();
                      await page.setDefaultNavigationTimeout(0);
  
                      await page.goto((startedClass), {waitUntil: 'networkidle2'});
                      await ctx.reply(`Your ${subjectnames} class is started. If you willings to join follow this link: \n\n${startedClass}`)
  
                      // await ctx.reply(`Your ${subjectnames} class is started. If you willings to join follow this link: ${startedClass}`)
                      await ctx.reply(`Successfully Joined Your Class - ${subjectnames}!`)
                      const selectAudio = await page.waitForSelector('body > div.portal--27FHYi > div > div > div.content--IVOUy > div > div > span > button:nth-child(2) > span.button--Z2dosza.jumbo--Z12Rgj4.default--Z19H5du.circle--Z2c8umk')
                      selectAudio.click()
                      console.log(`Successfully Joined Your Class - ${subjectnames}! i am waiting for atleast 1 hour`)
                      await page.waitForTimeout(3300000)
                      console.log(`Successfully Completed your Classes ${subjectnames}`)
                      ctx.reply(`Successfully Completed your Class - ${subjectnames}`);
                      await browser.close()  
                    })();
                    return startedClass
                  } else {
                    console.log(`${subjectnames} Class is not started Yet`)
                  }
                }
                joinclassModule()
                 },
                 {
                     scheduled: true,
                     timezone: 'Asia/Kolkata'
                 }
                )
            })
           
            console.log(`You have Total Classes: \n\n${subNames}`)
            ctx.reply(`You have Total Classes:  ${subNames}
             `)
             ctx.reply(`You have Successfully Scheduled your classes. Your Timings is : ${scheduledTimes} \n\nNote: If your classes has already started then this bot can't do anything`)
             ctx.reply(`Thanks for using this bot. If you have any query feel free to drop message: @spraveenofficial \n\nNote: This is only for educational purpose. Use this with your own risk.`)
          }
          }

         
         makeRequest()
  }
 bot.launch()
 app.listen(process.env.PORT, '0.0.0.0');