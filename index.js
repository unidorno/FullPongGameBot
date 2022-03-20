const express = require("express");
const path = require("path");
const config = require('./config')
const TelegramBot = require("node-telegram-bot-api");
const TOKEN = config.TOKEN;
const server = express();
const bot = new TelegramBot(TOKEN, {
    polling: true
});
const group_id = -1001614284951
const port = process.env.PORT || 5000;
const gameName = "pong";
const queries = {};
let is_verified = []
let timer = setTimeout(() => PostPonePosting(), 1000 * 60);

const hellomessage = 'Hi, with the help of this bot you can get verified by winning in a pong game. \n\nTo get verified, you need to win our AI 3 times.\n\n🎮 Press Play button to start'
const already_verified = '✅ You are already verified'
const now_verified = '✅ You are verified now. Good job!'
bot.on('message', msg => {
    const { chat, message_id, text } = msg
    console.log(msg)
})
bot.onText(/start|game/, (msg) => {

    const { chat, message_id, text } = msg
    if (is_verified[chat.id] === undefined){
        bot.sendMessage(chat.id, hellomessage, {
            parse_mode: 'HTML',
        })
        .then(() => {
            bot.sendGame(msg.from.id, gameName, {
                protect_content: true
            })
        })
    }

    if (is_verified[chat.id] !== undefined && is_verified[chat.id] === true){
        bot.sendMessage(chat.id, already_verified, {
            parse_mode: 'HTML',
        })
        
        
    }
});

bot.on("callback_query", function (query) {
    const { chat, message_id, text } = query.message

    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
    } else {
        queries[query.id] = query;
        let gameurl = "https://fiverrpong.herokuapp.com/index.html?id=" + query.id;
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            url: gameurl
        });
    }
});
bot.on("inline_query", function (iq) {
    bot.answerInlineQuery(iq.id, [{
        type: "game",
        id: "0",
        game_short_name: gameName
    }]);
});
server.use(express.static(path.join(__dirname, 'mobile')));

server.get("/highscore/:score", function (req, res, next) {
    if (!Object.hasOwnProperty.call(queries, req.query.id)) return next();
    let query = queries[req.query.id];
    /* let options;
    if (query.message) {
        options = {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        };
    } else {
        options = {
            inline_message_id: query.inline_message_id
        };
    } */
    bot.setGameScore(query.from.id, parseInt(req.params.score), options,
        function (err, result) {})
    .then(res => {
        bot.createChatInviteLink(group_id, 'newuser', res.date + 60000 * 60, 1)
        .then(invite => {
            bot.sendMessage(query.message.chat.id, now_verified, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: 'Join group',
                            url: invite.invite_link
                        }]
                    ]
                }
            })
        })
    })
    is_verified[chat.id] = true
    /* bot.setGameScore(query.from.id, parseInt(req.params.score), options,
        function (err, result) {}); */
});
server.listen(port);

function PostPonePosting(){
    console.log('postpone')
    clearTimeout(timer);
    timer = setTimeout(() => PostPonePosting(), 1000 * 60);
}
