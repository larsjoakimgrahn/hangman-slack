const AWS = require('aws-sdk');
const randomWords = require('random-words');
const { hangman } = require('./hangman.js');

const docClient = new AWS.DynamoDB.DocumentClient();

const startNewGame = async(channel) => {
    const params = {
        TableName: 'hangman_session',
        Item: {
            id: channel,
            word: randomWords(),
            guesses: [],
        }
    }

    try {
        await docClient.put(params).promise();
        return params
    } catch (err) {
        return err;
    }
}

const getGame = async(channel) => {
    var params = {
        AttributesToGet: [
            "guesses",
            "word"
        ],
        TableName: 'hangman_session',
        Key: {
            "id": channel
        }
    }

    const session = await docClient.get(params, (err, data) => {
        if (err) {
            console.log(err);
            throw new Error(err);
        } else {
            return data;
        }
    }).promise();

    if (session.Item == null) {
        return await startNewGame(channel);
    } else {
        return session
    }
}

const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y'];
const generateLetters = (alreadyGuessed) => {

    const difference = alphabet.filter(letter => !alreadyGuessed.includes(letter));
    return difference.map(
        letter => ({
            type: "button",
            value: letter,
            text: {
                type: "plain_text",
                text: letter
            }
        })
    )
}

const generateResult = (word, alreadyGuessed) => {
    let letters = {
        "type": "actions",
        "elements": generateLetters(alreadyGuessed)
    }

    const incorrectGuesses = [...alreadyGuessed].filter(letter => ![...word].includes(letter)).length
    const hangmanStatus = hangman[incorrectGuesses];

    const remainingGuesses = 6 - incorrectGuesses;

    const currentGuessWord = [...word].map(letter => alreadyGuessed.includes(letter) ? letter : " _ ").join('');

    let actions = {
        "type": "divider"
    }

    if (remainingGuesses <= 0 || currentGuessWord == word) {
        letters = {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Game finished! The correct word was " + word + "!"
            },
        };

        actions = {
            "type": "actions",
            "elements": [{
                "type": "button",
                "value": "reset",
                "text": {
                    "type": "plain_text",
                    "text": "Start New Game"
                }
            }]
        }

    }
    return {
        "response_type": "in_channel",
        "blocks": [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Let's Play Hangman!:*\n\nYour word is \n```" + currentGuessWord + "```\n\n" + remainingGuesses + " errors remaining!\n\n\n```" + hangmanStatus + "```"
                }
            },
            {
                "type": "divider"
            },
            letters,
            actions
        ]
    };
}

exports.guess = async(channel, letter) => {
    const game = await getGame(channel)

    const guessArray = game.Item.guesses;
    guessArray.push(letter);

    const params = {
        TableName: 'hangman_session',
        Item: {
            id: channel,
            word: game.Item.word,
            guesses: [...new Set(guessArray)],
        }
    }

    try {
        await docClient.put(params).promise();
        return generateResult(game.Item.word, guessArray);
    } catch (err) {
        return err;
    }
}

exports.getOrStartGame = async(channel) => {
    const game = await getGame(channel)

    return generateResult(game.Item.word, game.Item.guesses);
}

exports.resetGame = async(channel) => {
    var params = {
        TableName: 'hangman_session',
        Key: {
            "id": channel
        }
    }

    await docClient.delete(params, (err, data) => {
        if (err) {
            console.log(err);
            throw new Error(err);
        } else {
            return data;
        }
    }).promise();
    return "Successfully reset game."
}