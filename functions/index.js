const admin = require("firebase-admin");
admin.initializeApp();

const { triviaAnswers } = require("./lib/triviaAnswers");

exports.triviaAnswers = triviaAnswers;
