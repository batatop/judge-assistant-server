const { messageTypes } = require('./constants');
const { storage, db, firebase } = require('./firebase');
const OpenAI = require('openai').OpenAI
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');

dotenv.config();

const ASSISTANT_ID = 'asst_FxuWrPwqZzGXUKDPUENVwHyr';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function convertFileToText(uid, caseId, fileId) {
    const bucket = storage.bucket();

    const filePath = `${uid}/${caseId}/${fileId}`;
    const file = bucket.file(filePath);

    try {
        const [fileExists] = await file.exists();
        if (!fileExists) {
            throw new Error('File does not exist');
        }

        const [fileContents] = await file.download();
        const fileType = file?.metadata?.contentType;
        if (fileType === 'application/pdf') {
            extractTextFromPDF(fileContents);
        }
        return fileContents;
    } catch (error) {
        console.error('Error fetching file:', error);
        throw error; // or handle it as per your application's needs
    }
}
exports.convertFileToText = convertFileToText;

function extractTextFromPDF(pdfBuffer) {
    return new Promise((resolve, reject) => {
        pdfParse(pdfBuffer).then(function (data) {
            resolve(data.text); // Display the text content of the PDF
        }).catch(function (error) {
            reject(error);
        });
    })
}
exports.extractTextFromPDF = extractTextFromPDF;

function sendMessage(uid, caseId, message) {
    return new Promise((resolve, reject) => {
        // const caseDbRef = db.ref(`/cases/${uid}/${caseId}/chat`);
        // const newMessageRef = caseDbRef.push();
        // newMessageRef.set({
        //     message,
        //     type: messageTypes.user,
        //     timestamp: firebase.database.ServerValue.TIMESTAMP
        // }, (error) => {
        //     if (error) {
        //         reject(error);
        //     } else {
        sendMessageToAgent(message, uid, caseId)
        resolve();
        // }
        // })
    })
}
exports.sendMessage = sendMessage;

async function sendMessageToAgent(messageText) {
    const thread = await openai.beta.threads.create();
    console.log("thread", thread)

    const message = await openai.beta.threads.messages.create(
        thread.id,
        { role: messageTypes.user, content: messageText }
    );
    console.log("message", message)

    let run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID
    });
    // wait until the run is complete
    while (run.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    console.log("run", run)

    const messages = await openai.beta.threads.messages.list(thread.id);
    console.log("messages", messages.data)

    const agentResponse = messages.data[0]?.content
    console.log("agentResponse", agentResponse)
}