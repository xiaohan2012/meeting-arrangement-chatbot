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

var intents = new builder.IntentDialog();

var button_style = builder.ListStyle['button']
bot.dialog('/',[
    function(session){
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
	session.dialogData.meeting = {
	    'people': results.response
	};
	console.log(results.response);
	session.send('ok.');
	builder.Prompts.time(session,
			     "Around when?");

    },
    function (session, results, next) {
	session.dialogData.meeting.time = results.response.resolution.start;
	next();
    },
    function(session, next){
	var meeting = session.dialogData.meeting;
	var msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Meeting summary")
		    .text('People: ' + meeting['people']
			  + '\n\n'
			  + "Time: " + meeting['time']
			 )
		// builder.Fact.create(session, meeting['people'], "1"),
                // builder.Fact.create(session, meeting['time'], "Time")
            ]);
        session.send(msg);
	builder.Prompts.choice(session,
			       "Is the above correct?",
			       "yes|no",
			       {listStyle: button_style});
    },
    function(session, results, next){
	if(results.response.entity === 'yes'){
	    session.send('great, done!');
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


bot.dialog('/arrange_activity', function (session) {
    session.send();
});
