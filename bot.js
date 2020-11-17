const { Client, Intents } = require("discord.js");
const intents = new Intents([
    Intents.NON_PRIVILEGED, // include all non-privileged intents, would be better to specify which ones you actually need
    "GUILD_MEMBERS", // lets you request guild members (i.e. fixes the issue)
]);
const client = new Client({ ws: { intents } });

var getMentions = function (command, guild) {
    var splitOnSpaces = command.split(/\s+/);
    var mentions = {
        roles: [],
        channels: []
    };
    for (var substr of splitOnSpaces) {
        if (substr[0] === '<' && substr[substr.length - 1] === '>') {
            if (substr.length === 22 && substr[1] === '@' && substr[2] === '&') {
                var snowflake = substr.replace(/[\<\@\&\>]/g, '');
                mentions.roles.push(guild.roles.resolve(snowflake));
            } else if (substr.length === 21 && substr[1] === '#') {
                var snowflake = substr.replace(/[\<\#\>]/g, '');
                mentions.channels.push(guild.channels.resolve(snowflake));
            }
        }
    }
    return mentions;
}

var createRoom = async function (guild, name, n, staffSpectatorInvisible) {
    var category = await guild.channels.create(name, {type: 'category'});
    await category.updateOverwrite(guild.roles.everyone, {
	'VIEW_CHANNEL': false
    });
    // did not reimplement with getRole() because this way we make one pass instead of two
    var staffRole = 0, spectatorRole = 0;
    for (var role of guild.roles.cache.array()) {
	if (role.name === 'Staff' && staffRole === 0) {
	    staffRole = role;
	} else if (role.name === 'Spectator' && spectatorRole === 0) {
	    spectatorRole = role;
	}
    }
    if (!staffSpectatorInvisible) {
	await category.updateOverwrite(staffRole, {
	    'VIEW_CHANNEL': true
	});
	await category.updateOverwrite(spectatorRole, {
	    'VIEW_CHANNEL': true
	});
    }
    var cleanName = name.replace(/\s+/g, '-').toLowerCase();
    for(var i = 1; i <= n; i++) {
    var text = await guild.channels.create(cleanName + '-text-' + i, {parent: category});
    }
    var voice = await guild.channels.create(cleanName + '-voice', {parent: category, type: 'voice'});
    return text;
}

var confirm = async function (message, prompt, failCallback, successCallback) {
    
    message.channel.send(prompt).then(function (msg) {
	msg.react('👍');
	msg.awaitReactions(function (reaction, user) {
	    return reaction.emoji.name === '👍' && user.id === message.author.id;
	}, {time: 6000}).then(function (collected) {
	    if (collected.size === 0) {
		failCallback();
	    } else {
		successCallback();
	    }
	}).catch(console.error);
    });
}

var hasRole = function (member, roleName) {
    var roles = member.roles.cache.array();
    for (var role of roles) {
	if (role.name === roleName) {
	    return true;
	}
    }
    return false;
}

var add = async function (role, to) {
    await to.updateOverwrite(role, {
	'VIEW_CHANNEL': true,
	'SEND_MESSAGES': true,
	'ADD_REACTIONS': true,
	'READ_MESSAGE_HISTORY': true,
	'CONNECT': true,
	'SPEAK': true
    });
    return;
}

client.on('message', async function(message) {
    var content = message.content;
	if (content.indexOf('*c') === 0 && hasRole(message.member, 'Control Room')) {
		try {
			var content = content.substr(content.indexOf(' ') + 1).trim();
			args = content.split(" ");
			n = parseInt(args[0]);
			var names = content.split(/["“”]/g);
			if (names.length < 2) {
				message.channel.send("NO HELP FOR YOU.");
				return;
				}
				confirm(message, 'Are you sure you want to create the room[s] ' + content + '? Confirm by reacting with \:thumbsup:.', function () {
				message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
				for (var i = 1; i < names.length; i += 2) {
					var name = names[i];
					createRoom(message.channel.guild, name, n).then(function (textChannel) {
					// message.channel.send('Room "' + name + '" has been created.');
					message.channel.send('Room "' + textChannel.parent.name + '" has been created.');
					}).catch(function (error) {
					console.error(error);
					message.channel.send('Room "' + name + '" could not be created. Please try using a different name.');
					});
				}}
				);
		} catch (e) {
			console.error(e);
			message.channel.send("uh-oh.");
		}
	}
	if (content.indexOf('*a') === 0 && (hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff'))) {
		try {
			var mentions = getMentions(content, message.guild);
			var roles = mentions.roles;
			var role = roles[0];
			var channels = mentions.channels;
			channels.forEach((channel) =>  {
				var to = channel.parent;
				var voice_channel = to.children.find(c => c.type == 'voice');
				confirm(message, 'Are you sure you want to add team ' + role.toString() + ' to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', function () {
				message.channel.send('No confirmation was received. The addition is cancelled.');
				}, function () {
					add(role, voice_channel).then(function () {
						message.channel.send('Team ' + role.toString() + ' has been added to room "' + voice_channel.name + '."');
					}).catch(function (error) {
						console.error(error);
						message.channel.send("no help for you.");
					});
				add(role, channel).then(function () {
					message.channel.send('Team ' + role.toString() + ' has been added to room "' + channel.name + '."');
				}).catch(function (error) {
					console.error(error);
					message.channel.send("nope.");
				});
				});
			}
			);
		} catch (e) {
			console.error(e);
			message.channel.send("yeah, i have no idea.");
		}
		}
	if (content.indexOf('*r') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var mentions = getMentions(content, message.guild);
				var roles = mentions.roles;
				var role_old = roles[0];
				var role_new = roles[1];
				role_old.members.each(member => member.roles.add(role_new));
			} catch (e) {
				console.error(e);
				message.channel.send("something you did was bad.");
			}
		}
});

// THIS  MUST  BE  THIS  WAY
console.log('huh');
client.login(process.env.BOT_TOKEN);
client.on('ready', async function () {
    for (var guild of client.guilds.cache.array()) {
	await guild.members.fetch();
	try {
	    console.log(guild.name + ' ' + guild.owner.user.tag);
	} catch (e) {
	    console.log(guild.name);
	}
    }
    client.user.setActivity('quizbowl!', {type: 'PLAYING'}).then(function () {
	console.log('up and running!');
    }).catch(console.error);
});
