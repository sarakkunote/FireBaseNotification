const functions = require("firebase-functions");
const admin = require("firebase-admin");

//Init
// var serviceAccount = require("./notificationsample-5c1f4-firebase-adminsdk-plsu7-928a0e1a10.json"); //safu account
var serviceAccount = require("./sarakku-note-firebase-adminsdk-gh9rf-2fb3f250c9.json");//Sarakku account
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

function Message(title, body) {
    this.title = title;
    this.body = body;  
}

//Firebase Functions
exports.createProduct = functions.firestore.document("product/{docId}").onCreate((snap, context) => {
    console.log("New Product Added Event Triggered: START");

    const newValue = snap.data();

    const productName = newValue.productName;

    console.log("New productName = " + productName);

    var message = createMessage(productName);

    // sendToMuzMobile(message.title, message.body);
    sendToAll(message.title, message.body);

    console.log("New Product Added Event Triggered: END");
  });

//Firebase Functions
exports.sendHttpPushNotification = functions.https.onRequest(
  (request, response) => {
    console.log("In sendHttpPushNotification: START");

    response.send("Hello from Firebase 1");

    // sendToMuzMobile(message.title, message.body);

    //readData();

    console.log("In sendHttpPushNotification: END");

    return { success: true };
  }
);

function createMessage(productName) { 

  var title =  "New Product Alert !";
  var body = `A new ${productName} has been added, please click to view the details`;

  var myMessage = new Message(title, body);

  return myMessage;
}

function sendToAll(title, body) {

  const db = admin.firestore();

  db.collection("company")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {

        var fcmToken = `${doc.data().fcmToken}`;
        console.log(fcmToken);

        if (fcmToken != null && fcmToken.length > 0) {
          sendNotification(fcmToken, title, body);
        }
      });
    });
}

function sendToMuzMobile(title, body) {
  const s1 = "f28B911bTROgXQgKuLCBkA:APA91bHEtIoFWfK3rx56kyD9TVmtDt";
  const s2 = "-aTNZWCbhTgG_vhXKJuMWE42xDoqklLPGthhS1rxd2IKWfC5D";
  const s3 = "obSoLrdiYnbCnLRBiiRxAKah16NkJlt";
  const s4 = "y0EWvbsjUYIG7aSY6Bp4Aza2TFpdLc";
  const fcmToken = s1 + s2 + s3 + s4;

  sendNotification(fcmToken, title, body);
}

function sendNotification(fcmToken, title, body) {
  console.log("In sendNotification: START");

  const payload = {
    notification: {
      title: title,
      body: body,
    },
  };

  admin
    .messaging()
    .sendToDevice(fcmToken, payload)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);

      console.log(response.results[0].error);

      return { success: true };
    })
    .catch((error) => {
      console.log("In sendHttpPushNotification: caught exception " + error);

      return { error: error.code };
    });
}