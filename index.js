const { getOrStartGame, guess, resetGame } = require('./game');
const helpText = require('./help.json');

const tiny = require('tiny-json-http');

exports.handler = async(event, context) => {
    const bodyBuffer = Buffer.from(event.body, "base64");
    const body = bodyBuffer.toString("utf-8");

    let slackRequest = {};
    body
        .split("&")
        .map((el) => el.split("="))
        .forEach((ar) => (slackRequest[ar[0]] = ar[1]));

    if (slackRequest.payload) {
        const payload = JSON.parse(decodeURIComponent(slackRequest.payload));
        const selectedValue = payload.actions[0].value

        if (selectedValue == 'reset') {
            await resetGame(payload.channel.id);
            const newGame = await getOrStartGame(payload.channel.id);
            await tiny.post({
                url: payload.response_url,
                data: newGame
            });
            return "";
        }

        const result = await guess(payload.channel.id, selectedValue);
        await tiny.post({
            url: payload.response_url,
            data: result
        });

        return "";
    }

    const command = slackRequest.text

    if (command == 'help') {
        return helpText;
    } else if (command == 'reset') {
        await resetGame(slackRequest.channel_id);
    }
    return await getOrStartGame(slackRequest.channel_id);
};