var showtimes = require('showtimes');

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
            onLaunch(event.request, event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(error, sessionAttributes, speechletResponse) {
                    if (error) {
                        context.fail(error);
                    }
                    else {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    }
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
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId + ", intent=" + intentName);

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
        console.log("Invalid intent: ", intentName);
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
    var speechOutput = "Welcome to Theater Info. ";

    var repromptText = "Please provide a zip code by saying zip code followed by a 5 digit number. ";
    speechOutput += repromptText;
    var shouldEndSession = false;

    callback(null, sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function setZipCodeInSession(intent, session, callback) {
    console.log("setZipCodeInSession");
    var cardTitle = intent.name;
    var zipSlot = intent.slots.zip;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var setZipCodeError = null;
    var MAX_THEATERS = 4;

    if (zipSlot) {
        var zipCode = getFiveDigitZip(zipSlot.value);
        sessionAttributes = setSessionAttribute(sessionAttributes, "zipCode", zipCode);

        console.log("setZipCodeInSession located zipSlot ", zipCode);

        speechOutput = "Retrieved theater info. ";
        repromptText = "You can provide me with a zip code by saying zip code followed by a 5 digit number. ";
        var listing = showtimes(zipCode, { pageLimit: 4 });
        listing.getTheaters(function (err, theaters) {
            if (err) {
                console.log("setZipCodeInSession exception while getting theaters", err);
                speechOutput = "There was an error retrieving theater info. ";
                repromptText = null;
                shouldEndSession = true;
                setZipCodeError = "GetTheatersException";
            }
            else {
                console.log("setZipCodeInSession retrieved theaters", theaters.length);
                var newTheaterList = [];
                var numTheaters = theaters.length > MAX_THEATERS ? MAX_THEATERS : theaters.length;
                for (var i = 0, j = numTheaters; i < j; i++) {
                    var theater = theaters[i];
                    newTheaterList.push(theater);
                    speechOutput += "Found " + theater.name + " at " + theater.address + ". ";
                }

                sessionAttributes = setSessionAttribute(sessionAttributes, "theaters", newTheaterList);

                repromptText = "Please provide a theater by saying theater name and then the name or I can repeat this information by saying repeat theater info. ";
                speechOutput += repromptText;
            }
            callback(setZipCodeError, sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    }
    else if (session.attributes.hasOwnProperty("theaters")) {
        for (var i = 0, j = session.attributes.theaters.length; i < j; i++) {
            var theater = session.attributes.theaters[i];
            speechOutput += "Found " + theater.name + " at " + theater.address + ". ";
        }

        repromptText = "Please provide a theater by saying theater name and then the name or I can repeat this information by saying repeat theater info. ";
        speechOutput += repromptText;

        callback(setZipCodeError, sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
    else {
        console.log("setZipCodeInSession exception: could not locate a zipSlot");
        speechOutput = "I'm not sure what your zip code is, please try again. ";
        repromptText = "I'm not sure what your zip code is, you can provide me a zip code by saying zip code followed by a 5 digit number. ";
        setZipCodeError = "UnknownZipCodeException";
        callback(setZipCodeError, sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function getFiveDigitZip(zipString) {
    var temp = 0;
    try {
        var tokens = zipString.split(" ");
        if (tokens.length === 5) {
            temp = parseInt("" + singleDigitWordtoNum(tokens[0]) + singleDigitWordtoNum(tokens[1]) + singleDigitWordtoNum(tokens[2]) + singleDigitWordtoNum(tokens[3]) + singleDigitWordtoNum(tokens[4]));
        }
        else {
            console.log("getFiveDigitZipSplitException", tokens, zipString);
        }
    }
    catch (excp) {
        console.log("getGiveDigitZipException", excp)
    }
    return temp;
}

function singleDigitWordtoNum(digit) {
    var num = 0;
    switch (digit) {
        case "one":
            num = 1;
            break;
        case "two":
            num = 2;
            break;
        case "three":
            num = 3;
            break;
        case "four":
            num = 4;
            break;
        case "five":
            num = 5;
            break;
        case "six":
            num = 6;
            break;
        case "seven":
            num = 7;
            break;
        case "eight":
            num = 8;
            break;
        case "nine":
            num = 9;
            break;
    }
    return num;
}

function setTheaterInSession(intent, session, callback) {
    console.log("setTheaterInSession");
    var theaterSlot = intent.slots.theater;
    var repromptText = null;
    var shouldEndSession = false;
    var speechOutput = "";
    var setTheaterInfoError = null;

    if (!(session.attributes && session.attributes.zipCode && session.attributes.theaters)) {
        //no zip code and/or no theater
        console.log("setTheaterInSession exception: no session attributes or theaters in session");
        speechOutput = "I need a zip code before I can take a theater name, please try again. ";
        repromptText = "I'm not sure what your zip code is, you can provide me a zip code by saying zip code 95630. ";
        setTheaterInfoError = "NoZipCodeOrTheaterException";
    }
    else if (!theaterSlot) {
        //no theater
        console.log("setTheaterInSession exception: no input provided for theater name");
        speechOutput = "I'm not sure what theater you provided, please try again. ";
        repromptText = "Please provide a theater by saying theater name Palladio Cinemas. ";
        setTheaterInfoError = "NoTheaterException";
    }
    else {
        //good
        console.log("setTheaterInSession: have a theater, zip code and theaters", session.attributes.zipCode, theaterSlot.value, session.attributes.theaters);

        var selectedTheaterName = theaterSlot.value;
        var selectedTheater = findStringMatch(selectedTheaterName, session.attributes.theaters);

        if (selectedTheater) {
            speechOutput += "I was able to find " + selectedTheater.movies.length + " playing at " + selectedTheater.name + " today. ";

            for (var k = 0, l = selectedTheater.movies.length; k < l; k++) {
                var tempMovie = selectedTheater.movies[k];
                var tempMovieName = tempMovie.name;
                speechOutput += "Movie " + k + ", " + tempMovieName + ". ";
            }
        }
        else {
            speechOutput = "I was unable to find the details for the theater " + theaterSlot.value + ". Please start over. ";
        }
    }
    shouldEndSession = true;
    callback(setTheaterInfoError, session.attributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}


/**
 * findStringMatch
 * inputString - the spoken theater name; eg palladio sixteen cinemas
 * stringList - array of names
 *
 * Approach:
 * 	some terms should match
 *  the number of terms/words should match
 *  position of matching terms should be the same
 *
 */
function findStringMatch(inputString, list) {
    inputString = inputString.toLowerCase();
    var hiScore = 0;
    var hiScoreMatch = null;

    var inputStringTokens = inputString.split(" ");

    for (var i = 0, j = list.length; i < j; i++) {
        var score = 0;
        var testString = list[i].name;
        testString = testString.toLowerCase();
        var testStringTokens = testString.split(" ");

        if (testStringTokens.length == inputStringTokens.length) {
            score++;
        }

        for (var k = 0, l = inputStringTokens.length; k < l; k++) {
            if (k < testStringTokens.length) {
                var tempToken = testStringTokens[k];
                var targetToken = inputStringTokens[k];
                if (tempToken == targetToken) {
                    score++;
                }
            }
        }

        if (score > hiScore) {
            hiScore = score;
            hiScoreMatch = list[i];
        }
    }

    return hiScoreMatch;
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
