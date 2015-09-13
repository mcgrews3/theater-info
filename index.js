var showtimes = require('showtimes');
var converter = require('./numberWordConverter');

/**
 * Steps
 * 1. Specify a zip code --> read (4) theaters
 * 2. Specify a theater --> read movie names
 */

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("SetZipCodeIntent" === intentName) {
        setZipCodeInSession(intent, session, callback);
    }
    else if ("SetTheaterIntent" === intentName) {
        setTheaterInSession(intent, session, callback);
    }
    else if ("HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    }
    else {
        throw "Invalid intent";
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    console.log("getWelcomeResponse");

    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Theater Info.";

    var repromptText = "Please provide a zip code by saying zip code followed by a 5 digit number.";
    speechOutput += repromptText;
    var shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function setZipCodeInSession(intent, session, callback) {
    console.log("setZipCodeInSession");
    var cardTitle = intent.name;
    var zipSlot = intent.slots.zip;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    if (zipSlot) {
        console.log("setZipCodeInSession located zipSlot", zipSlot);

        var zipCode = zipSlot.value;
        sessionAttributes = setSessionAttribute(sessionAttributes, "zipCode", zipCode);
        speechOutput = "Retrieved theater info. ";
        repromptText = "You can provide me with a zip code by saying zip code 95630";
        var listing = showtimes(zipCode, { pageLimit: 4 });
        listing.getTheaters(function (err, theaters) {
            if (err) {
                console.log("setZipCodeInSession exception while getting theaters", err);
                speechOutput = "There was an error retrieving theater info.";
                repromptText = null;
                shouldEndSession = true;
            }
            else {
                console.log("setZipCodeInSession retrieved theaters", theaters);
                sessionAttributes = setSessionAttribute(sessionAttributes, "theaters", theaters);
                for (var i = 0, j = theaters.length; i < j; i++) {
                    var theater = theaters[i];
                    speechOutput += " Found " + theater.name + " at " + theater.address + ".";
                }

                speechOutput += " Please provide a theater by saying theater name Palladio 16 Cinemas.";
            }
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    }
    else {
        console.log("setZipCodeInSession exception: could not locate a zipSlot");
        speechOutput = "I'm not sure what your zip code is, please try again";
        repromptText = "I'm not sure what your zip code is, you can provide me a zip code by saying zip code 95630";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function setTheaterInSession(intent, session, callback) {
    console.log("setTheaterInSession");
    var theaters;
    var sessionAttributes = {};
    var theaterSlot = intent.slots.theater;
    var repromptText = null;
    var shouldEndSession = false;
    var speechOutput = "";

    if (!(session.attributes && session.attributes.zipCode && session.attributes.theaters)) {
        //no zip code and/or no theater
        console.log("setTheaterInSession exception: no session attributes or theaters in session");
        speechOutput = "I need a zip code before I can take a theater name, please try again";
        repromptText = "I'm not sure what your zip code is, you can provide me a zip code by saying zip code 95630";
    }
    else if (!theaterSlot) {
        //no theater
        console.log("setTheaterInSession exception: no input provided for theater name");
        speechOutput = "I'm not sure what theater you provided, please try again";
        repromptText = "Please provide a theater by saying theater name Palladio 16 Cinemas";
    }
    else {
        //good
        console.log("setTheaterInSession: have a theater, zip code and theaters", session.attributes.zipCode, session.attributes.theaters, theaterSlot.value);
        sessionAttributes = {};
        theaters = session.attributes.theaters;
        var selectedTheater = {};
        var selectedTheaterName = theaterSlot.value;
        var foundMatch = false;
        for (var i = 0, j = theaters.length; i < j; i++) {
            var tempTheater = theaters[i];
            if (tempTheater.name == selectedTheaterName) {
                foundMatch = true;
                selectedTheater = tempTheater;

                speechOutput += "I was able to find " + selectedTheater.movies.length + " playing at " + selectedTheater.name + " today.";

                for (var k = 0, l = selectedTheater.movies.length; k < l; k++) {
                    var tempMovie = selectedTheater.movies[k];
                    var tempMovieName = tempMovie.name;
                    speechOutput += " Movie " + k + " " + tempMovieName + ".";
                }
            }
        }
		
        //Did not find a match for selected theater name in theater
        if (!foundMatch) {
            speechOutput = "I was unable to find the details for the theater " + theaterSlot.value + ". Please start over.";
        }

        shouldEndSession = true;
    }

    callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function setSessionAttribute(session, prop, value) {
    session[prop] = value;
    return session;
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
