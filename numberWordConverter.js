
function numberToWord(num) {
	var str = "";
	if (num < 20) {
		switch (num) {
			case 0:
				str = "zero";
				break;
			case 1:
				str = "one";
				break;
			case 2:
				str = "two";
				break;
			case 3:
				str = "three";
				break;
			case 4:
				str = "four";
				break;
			case 5:
				str = "five";
				break;
			case 6:
				str = "six";
				break;
			case 7:
				str = "seven";
				break;
			case 8:
				str = "eight";
				break;
			case 9:
				str = "nine";
				break;
			case 10:
				str = "ten";
				break;
			case 11:
				str = "eleven";
				break;
			case 12:
				str = "twelve";
				break;
			case 13:
				str = "thirteen";
				break;
			case 14:
				str = "fourteen";
				break;
			case 15:
				str = "fiteen";
				break;
			case 16:
				str = "sixteen";
				break;
			case 17:
				str = "seventeen";
				break;
			case 18:
				str = "eighteen";
				break;
			case 19:
				str = "nineteen";
				break;
		}
	}
	else {

	}

	return str;
}

function wordToNumber(str) {
	var num = 0;

	switch (str) {
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

function wordsToNumber(words) {
	var tokens = words.split(" ");
	if (tokens.length !== 5) {
		return 0;
	}
	else {
		
	}
}

module.exports = {
	numberToWord: numberToWord,
	wordToNumber: wordToNumber,
	wordsToNumber: wordsToNumber
};