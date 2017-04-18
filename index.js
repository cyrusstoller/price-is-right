require('dotenv').config();

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');

const controller = Botkit.slackbot({
    json_file_store: (__dirname + '/data')
});

const owner = process.env.owner;
const bot = controller.spawn({
    token: process.env.token
}).startRTM();

//
// Help routes
//

controller.hears(['master help'], 'direct_message', function(bot, message){
    bot.reply(message, `
As a master your available commands are:
- \`I am your master\` to register as the master
- \`q: TEXT\` to set the question text
- \`a: NUMBER\` to set the true value
- \`results\` to see the results
- \`reset game\` to reset the game
- \`shutdown\` to turn off the bot
- \`uptime\` to see how long the bot has been running
    `);
});

controller.hears(['help'], 'direct_message', function(bot, message){
    bot.reply(message, `
Your available commands are:
- \`game time\` to register as a player in the game
- \`leave game\` to unregister from the game and to stop receiving notifications
- \`$NUMBER\` to enter your answer
- \`standings\` to see list of all the players
- \`num players\` to see how many players are registered
    `);
});

//
// Master routes
//

controller.hears(['I am your master'], 'direct_message', function(bot, message){
    controller.storage.channels.get('game', function(err, channel_data){
        var master;
        if (channel_data && channel_data.master) { master = channel_data.master; }

        if (master === message.user) {
            bot.reply(message, 'Yes master.');
        } else if (master) {
            bot.reply(message, 'Hmm ... you\'re being naughty. I already have a master.');
        } else {
            bot.reply(message, 'You are my new master.');
            controller.storage.channels.save({id: 'game', master: message.user});
        }
    });
});

function requireMaster(bot, message, callback) {
    controller.storage.channels.get('game', function(err, channel_data){
        var isMaster;

        if (channel_data && channel_data.master) {
            isMaster = (message.user === channel_data.master);
        }

        if (isMaster) {
            callback(bot, message, channel_data);
        } else {
            bot.reply(message, 'You\'re not my master ...');
        }
    });
}

controller.hears(['question: (.*)', 'q: (.*)'], 'direct_message', function(bot, message) {
    requireMaster(bot, message, function(bot, message, game_data){
        var text = message.match[1];
        bot.reply(message, 'Text: `' + text + '`');
        game_data.text = text;

        controller.storage.channels.save(game_data);
    });
});

function resetAnswers(){
    controller.storage.users.all(function(err, user_data){
        for (var i = user_data.length - 1; i >= 0; i--) {
            user_data[i].answer = null;
            controller.storage.users.save(user_data[i]);
        }
    });
}

function solicitResponseFromUser(user, text = null){
    var msg = '';
    if (text) {
        msg += '*Clue*: ' + text;
        msg += '\n--------------------------------';
    }
    msg += '\nPlease enter your guess preceeded by a `$` sign.';
    bot.reply(user, msg);
}

controller.hears(['answer: (.*)', 'a: (.*)'], 'direct_message', function(bot, message) {
    requireMaster(bot, message, function(bot, message, game_data){
        var amount = parseInt(message.match[1]);
        bot.reply(message, 'Max amount: ' + amount);
        game_data.current_amount = amount;

        resetAnswers();
        controller.storage.channels.save(game_data);

        controller.storage.users.all(function(err, user_data){
            for (var i = user_data.length - 1; i >= 0; i--) {
                solicitResponseFromUser(user_data[i], game_data.text);
            }
        });
    });
});

function usersWithCorrectAnswers(users, current_amount) {
    return users.filter(function(a){
        return a.answer <= current_amount; // only the valid responses
    }).sort(function(a,b){
        return b.answer - a.answer; // sort in descending order
    });
}

function usersWithIncorrectAnswers(users, current_amount) {
    return users.filter(function(a){
        return a.answer > current_amount; // only invalid responses
    }).sort(function(a,b){
        return a.answer - b.answer; // sort in ascending order
    });
}

function addPointsToUser(user, points) {
    if (user) {
        if (user.points) {
            user.points += points;
        } else {
            user.points = points;
        }

        controller.storage.users.save(user);
    }
}

function awardPoints(correctUsers, incorrectUsers) {
    var i, points;

    if (correctUsers) {
        for (i = correctUsers.length - 1; i >= 0; i--) {
            points = 1;
            if (i === 0) {
                points = 10;
            } else if (i === 1) {
                points = 5;
            }
            addPointsToUser(correctUsers[i], points);
        }
    }

    if (incorrectUsers) {
        for (i = incorrectUsers.length - 1; i >= 0; i--) {
            points = -1;
            if (i === incorrectUsers.length - 1) {
                points = -5;
            }
            addPointsToUser(incorrectUsers[i], points);
        }
    }
}

function askAboutPoints(bot, message, correctUsers, incorrectUsers) {
    bot.startConversation(message, function(err, convo) {
        if (!err) {
            convo.ask('Do you want to award points now?', [
                {
                    pattern: bot.utterances.yes,
                    callback: function(response, convo) {
                        awardPoints(correctUsers, incorrectUsers);
                        convo.say('I\'ll award the points right now');
                        convo.next();
                    }
                },
                {
                    pattern: bot.utterances.no,
                    callback: function(response, convo) {
                        convo.stop();
                    }
                },
                {
                    default: true,
                    callback: function(response, convo) {
                        convo.repeat();
                        convo.next();
                    }
                }
            ]);
        }
    });
}

function composeStandings(bot, message, data, current_amount){
    var correctUsers = usersWithCorrectAnswers(data, current_amount);
    var valid_answers = correctUsers.map(function(r){
        return r.name + ' - ' + r.answer; // creating the strings for each entry
    }).join('\n');

    var incorrectUsers = usersWithIncorrectAnswers(data,current_amount);
    var invalid_answers = incorrectUsers.map(function(r){
        return r.name + ' - ' + r.answer; // creating the strings for each entry
    }).join('\n');

    if (valid_answers === '') {
        valid_answers = 'No valid answers yet ...';
    }
    var response = '\n*Correct Answer:* ' + current_amount;
    response += '\n----------------------------------\n';
    response += '\n*Current standings*:\n' + valid_answers;
    if (invalid_answers !== '') {
        response += '\n\n*Busted Answers*:\n' + invalid_answers;
    }

    bot.reply(message, response);
    askAboutPoints(bot, message, correctUsers, incorrectUsers);
}

controller.hears(['get results', 'results'], 'direct_message', function(bot, message){
    requireMaster(bot, message, function(bot, message, game_data){
        var current_amount = game_data.current_amount;

        controller.storage.users.all(function(err, user_data){
            user_data = user_data.filter(function(u){
                return u.answer;
            });

            if (user_data.length > 0) {
                composeStandings(bot, message, user_data, current_amount);
            } else {
                bot.reply(message, 'No answers collected yet. Please be sure to set a question.');
            }
        });
    });
});

var yes_no_patterns = [
    {
        pattern: 'yes',
        callback: function(response, convo) {
            // since no further messages are queued after this,
            // the conversation will end naturally with status == 'completed'
            convo.next();
        }
    },
    {
        pattern: 'no',
        callback: function(response, convo) {
            // stop the conversation. this will cause it to end with status == 'stopped'
            convo.stop();
        }
    },
    {
        default: true,
        callback: function(response, convo) {
            convo.repeat();
            convo.next();
        }
    }
];

controller.hears(['clear standings', 'reset game'], 'direct_message', function(bot, message){
    requireMaster(bot, message, function(bot, message, game_data){
        bot.startConversation(message, function(err, convo) {
            if (!err) {
                convo.ask('Are you sure that you want to clear the standings?', yes_no_patterns);
                convo.on('end', function(convo) {
                    if (convo.status === 'completed') {
                        controller.storage.users.all(function(err, user_data){
                            for (var i = user_data.length - 1; i >= 0; i--) {
                                var user = user_data[i];
                                user.points = 0;
                                controller.storage.users.save(user);
                            }
                            bot.reply(message, 'The standings have been cleared');
                        });
                    } else {
                        bot.reply(message, 'OK, nevermind!');
                    }
                });
            }
        });
    });
});

//
// Participant routes
//

function setUsernameInDB(bot, convo, message) {
    if (convo.status === 'completed') {
        controller.storage.users.get(message.user, function(err, user) {
            if (!user) {
                user = {
                    id: message.user,
                    channel: message.channel,
                    user: message.user,
                    answer: null,
                    points: 0
                };
            }
            user.name = convo.extractResponse('nickname');
            controller.storage.users.save(user, function(err, id) {
                bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
            });
        });
    } else {
        // this happens if the conversation ended prematurely for some reason
        bot.reply(message, 'OK, nevermind!');
    }
}

controller.hears(['game time'], 'direct_message', function(bot, message){
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, user.name + ', I know who you are already. Get ready for the next question.');
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.ask('I do not know your name yet! What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', yes_no_patterns);
                        convo.next();
                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        setUsernameInDB(bot, convo, message);
                    });
                }
            });
        }
    });
});

controller.hears(['leave game'], 'direct_message', function(bot, message){
    bot.startConversation(message, function(err, convo){
        convo.ask('Are you sure you want to leave the game?', yes_no_patterns);
        convo.on('end', function(convo){
            convo.say('Ok ... bye bye');
            controller.storage.users.delete({id: message.user}, function(err){ // jank but need the id to be nested
                bot.botkit.log('Deleting: ' + message.user);
            });
        });
    });
});

//
// Summary routes
//

controller.hears(['number of players', 'num players'], 'direct_message', function(bot, message){
    controller.storage.users.all(function(err, all_user_data){
        bot.reply(message, 'Number of registered players: ' + all_user_data.length);
    });
});

controller.hears(['show players', 'players', 'standings'], 'direct_message', function(bot, message){
    controller.storage.users.all(function(err, all_user_data){
        var msg = all_user_data.sort(function(a,b) {
            return a.points - b.points;
        }).map(function(a){
            return a.name + ' (' + a.points + ')';
        }).sort().join('\n');

        bot.reply(message, '*Current players are:*\n' + msg);
    });
});

controller.hears(['\\$(.*)'], 'direct_message', function(bot, message){
    controller.storage.users.get(message.user, function(err, user){
        if (user) {
            var amount =  parseInt(message.match[1]);
            // bot.botkit.log(JSON.stringify(message));
            user.answer = amount;
            controller.storage.users.save(user, function(err, id){
                var msg = 'I received your guess of `' + amount + '`. ';
                msg += 'If you would like to change your guess please enter another message preceeded by the `$`.';
                bot.reply(message, msg);
            });
        } else {
            var msg = 'You need to register first. To do that, type `game time`. Once I know your name, be sure to guess again.';
            bot.reply(message, msg);
        }
    });
});

//
// Utility routes
//

controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {
    requireMaster(bot, message, function(bot, message){
        bot.startConversation(message, function(err, convo) {
            convo.ask('Are you sure you want me to shutdown?', [
                {
                    pattern: bot.utterances.yes,
                    callback: function(response, convo) {
                        convo.say('Bye!');
                        convo.next();
                        setTimeout(function() {
                            process.exit();
                        }, 3000);
                    }
                },
                {
                    pattern: bot.utterances.no,
                    default: true,
                    callback: function(response, convo) {
                        convo.say('*Phew!*');
                        convo.next();
                    }
                }
            ]);
        });
    });
});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime !== 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });
