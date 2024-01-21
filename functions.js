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
        const caseDbRef = db.ref(`/cases/${uid}/${caseId}/chat`);
        const newMessageRef = caseDbRef.push();
        newMessageRef.set({
            message,
            type: messageTypes.user,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }, (error) => {
            if (error) {
                reject(error);
            } else {
                sendMessageToAgent(message, uid, caseId)
                resolve();
            }
        })
    })
}
exports.sendMessage = sendMessage;

async function sendMessageToAgent(messageText, uid, caseId) {
    console.log("sendMessageToAgent", { messageText, uid, caseId })

    // get thread id
    const threadId = await getThreadId(uid, caseId);

    const message = await openai.beta.threads.messages.create(
        threadId,
        { role: messageTypes.user, content: messageText }
    );

    let run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: ASSISTANT_ID
    });
    // wait until the run is complete
    while (run.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await openai.beta.threads.messages.list(threadId);

    const agentResponse = messages.data[0]?.content?.[0]?.text?.value;
    console.log("agentResponse", {agentResponse, uid, caseId})

    const caseDbRef = db.ref(`/cases/${uid}/${caseId}/chat`);
    const newMessageRef = caseDbRef.push();
    newMessageRef.set({
        message: agentResponse,
        type: messageTypes.agent,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }, (error) => {
        if (error) {
            console.error(error);
        }
    })
}

async function getThreadId(uid, caseId) {
    return new Promise(async (resolve, reject) => {
        const caseDbRef = db.ref(`/cases/${uid}/${caseId}`);
        caseDbRef.once('value', async (snapshot) => {
            let threadId = snapshot.val()?.threadId;
            if (!threadId) {
                // create thread
                threadId = await createThread(uid, caseId);
                console.log("created thread", threadId)
            }
            resolve(threadId);
        }, (error) => {
            reject(error);
        })
    })
}

function createThread(uid, caseId) {
    return new Promise((resolve, reject) => {
        openai.beta.threads.create().then((thread) => {
            const caseDbRef = db.ref(`/cases/${uid}/${caseId}`);
            caseDbRef.update({
                threadId: thread.id
            })
            resolve(thread.id);
        }).catch((error) => {
            reject(error);
        })
    })
}