// MICROSOFT_APP_ID=0efdbb4f-7841-4995-a027-86e928b858a4 MICROSOFT_APP_PASSWORD=TqVcxfTVWWMj7LO8nusgCfS


var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
    
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
    
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });

var intents = new builder.IntentDialog();

var button_style = builder.ListStyle['button']

var MongoClient = require('mongodb').MongoClient
, assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/bot';

var addresses = [];
var time = null;

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
    var user_col = db.collection('user');
    user_col.ensureIndex("id", function(err, r){
	assert.equal(err, null);
	console.log('ensured index on id');
    })
    
    assert.equal(null, err);
    console.log("Connected successfully to server");

    bot.dialog('/',[
	function(session){
	    var addr = session.message.address
	    var user = JSON.parse(JSON.stringify(addr.user));

	    user['address'] = addr;
	    
	    user_col.update({'id': user.id},
			    user,
			    {upsert: true},
			    function(err, r){
				console.log('added user:', user);
				assert.equal(err, null);
			    });
	    // user_col.insertOne(user, function(err, r) {
	    // 	assert.equal(null, err);
	    // 	assert.equal(1, r.insertedCount);
	    // })

	    builder.Prompts.choice(session,
				   "Would you like me to arrange a meeting for you?",
				   "yes|no",
				   {listStyle: button_style});
	},
	function(session, results){
	    if(results.response.entity === 'yes'){
		
		session.send('Lets start');
		builder.Prompts.text(session, "Who would you like to invite? \n PS: separate names by comma.");
	    }
	    else{
		session.send('Hope I can help you in the future!');
		session.endDialog();
	    }
	},
	function(session, results){
	    // console.log('session.dialogData.meeting:', session.dialogData.meeting);
	    results.response.split(",").forEach(function(name){
		user_col.findOne({'name': name.trim()}, function(e, r){
		    assert.equal(e, null);
		    if(r !== null){
			console.log('found', r);
			// undefined
			// console.log('session.dialogData.meeting (inside):', session.dialogData.meeting);
			addresses.push(r.address);
		    }
		})
	    })


	    console.log(results.response);
	    session.send('Ok. I will notify them.');
	    builder.Prompts.time(session,
				 "And around when?");

	},
	function (session, results, next) {
	    time = results.response.resolution.start;
	    next();
	},
	function(session, next){
	    var meeting = session.dialogData.meeting;
	    var msg = new builder.Message()
		.attachments([create_meeting_card(session, addresses, time)]);
	    
            session.send(msg);
	    builder.Prompts.choice(session,
				   "Is the above correct?",
				   "yes|no",
				   {listStyle: button_style});
	},
	function(session, results, next){
	    if(results.response.entity === 'yes'){
		session.send('Great, done. \n\nI will notify others!');
		addresses.forEach(function(addr){
		    var msg = new builder.Message()
			.address(addr)
			.text('There is a meeting for you:\n');

		    bot.send(msg, function (err) {
			console.log(err);
		    });
		    
		    var msg = new builder.Message()
			.address(addr)
			.attachments([create_meeting_card(session, addresses, time)]);

		    bot.send(msg, function (err) {
			console.log(err);
		    })		    
		});		
		next();
	    }else{
		builder.Prompts.choice(session,
				       "What\'s wrong?",
				       "time|people|location",
				       {listStyle: button_style});
	    }
	},
	function(session){
	    // console.log('meeting:', JSON.stringify(session.dialogData.meeting));
	    session.endDialog();
	}
    ]
	      );
    // db.close();    
});


bot.dialog('/arrange_activity', function (session) {
    session.send();
});

function create_meeting_card(session, addresses, time){
    console.log('len(addresses)', addresses.length);
    var people_list = addresses.map(function(addr){	
	return addr.user.name;
    });
    return new builder.ThumbnailCard(session)
	.title("Meeting summary")
	.text('People: ' + people_list.join(', ')
	      + '\n\n'
	      + "Time: " + time
	     );
}
