// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');
const nodemailer = require("nodemailer");

class DispatchBot extends ActivityHandler {
    /**
     * @param {any} logger object for logging events, defaults to console if none is provided
     */
    constructor(logger) {
        super();
        if (!logger) {
            logger = console;
            logger.log('[DispatchBot]: logger not passed in, defaulting to console');
        }

        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true,
            includeInstanceData: true
        }, true);

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAAuthKey,
            host: process.env.QnAEndpointHostName
        });

        this.logger = logger;
        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;

        this.onMessage(async (context, next) => {
            this.logger.log('Processing Message Activity.');

            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.
            const recognizerResult = await dispatchRecognizer.recognize(context);
            // Top intent tell us which cognitive service to use.
            const intent = LuisRecognizer.topIntent(recognizerResult);
            // Next, we call the dispatcher with the top intent.
            await this.dispatchToTopIntentAsync(context, intent, recognizerResult);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const welcomeText = 'Type a greeting or a question about the weather to get started.';
            const membersAdded = context.activity.membersAdded;

            for (let member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(`Welcome to Dispatch bot ${ member.name }. ${ welcomeText }`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async dispatchToTopIntentAsync(context, intent, recognizerResult) {
        this.logger.log("Enters dispatchToTopIntentAsync");
        switch (intent) {
        case 'l_HomeAutomation':
            await this.processHomeAutomation(context, recognizerResult.luisResult);
            break;
        case 'q_sample-qna':
            await this.processSampleQnA(context);
            break;
        default:
            this.logger.log(`Dispatch unrecognized intent: ${ intent }.`);
            await context.sendActivity(`Dispatch unrecognized intent: ${ intent }.`);
            break;
        }
    }

    async processHomeAutomation(context, luisResult) {
        this.logger.log('processHomeAutomation');

        // Retrieve LUIS result for Process Automation.
        const result = luisResult.connectedServiceResult;
        const intent = result.topScoringIntent.intent;
        this.sendTicket().catch(console.error);
        await context.sendActivity(`HomeAutomation top intent ${ intent }.`);
        await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async sendTicket() {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTPHost,
            port: process.env.SMTPPort,
            secure: false,
            auth: {
                user: process.env.SMTPUser,
                pass: process.env.SMTPPass
            }
        });

        let info = await transporter.sendMail({
           from: '"IT Support Chat Bot" <hjayakumar@wisc.edu>',
           to: "jayakumarh@schneider.com, jayakumar@schneider.com",
           subject: "Password Reset",
           text: "I am having issues reseting my password\nPriority: 5\nPrimary Application: N/A"
        });

        console.log("Message sent: %s", info.messageId)
    }

    // async processITSupport(context, luisResult) {
    //     this.logger.log('processITSupport');

    //     //Retrieve LUIS result from ITSupport
    //     const result = luisResult.connectedServiceResult;
    //     const intent = result.topScoringIntent.intent;

    //     await context.sendActivity("ITSupport top intent")
    // }

    async processSampleQnA(context) {
        this.logger.log('processSampleQnA');

        const results = await this.qnaMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Q and A system.');
        }
    }
}

module.exports.DispatchBot = DispatchBot;
