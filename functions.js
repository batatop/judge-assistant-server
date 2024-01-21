const { messageTypes } = require('./constants');
const { storage, db, firebase } = require('./firebase');
const pdfParse = require('pdf-parse');

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
                resolve();
            }
        })
    })
}
exports.sendMessage = sendMessage;

function sendMessageToAgent() {
    
}