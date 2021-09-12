const functions = require("firebase-functions");
const admin = require("firebase-admin");

//Init
//ONLY DIFFERENCE
// var serviceAccount = require("./notificationsample-5c1f4-firebase-adminsdk-plsu7-928a0e1a10.json"); //safu account
var serviceAccount = require("./sarakku-note-firebase-adminsdk-gh9rf-2fb3f250c9.json");//Sarakku account
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

function Message(title, body) {
  this.title = title;
  this.body = body;
}

//Collections
const COMPANY_COLLECTION = "company";
const COMPANY_RELATION_COLLECTION = "company_relation";
const PRODUCT_COLLECTION = "product";
const PRODUCT_STATUS_COLLECTION = "product_status";

//Collection Wildcards
const PRODUCT_COLLECTION_WILDCARD = "product/{productId}";

//Product Status
const DISCOUNT_STATUS = "Discount";
const OUT_OF_STOCK_STATUS = "Out of Stock";
const NEW_STOCK_STATUS = "New Stock";
const BULK_PURCHASE_STATUS = "Bulk Purchase";

const ISCUSTOMER = "isCustomer";
const ISSUPPLIER = "isSupplier";

const STATUS = "status";
const COMPANY_ID = "companyId";
const EQUALS = "==";

//Firebase Functions
exports.changeProductStatus = functions.firestore
  .document(PRODUCT_COLLECTION_WILDCARD)
  .onUpdate((change, context) => {
    console.log("Product Update Event Triggered: START");

    try {
      const previousValue = change.before.data();
      console.log("previousValue", " => ", previousValue);

      const newValue = change.after.data();
      console.log("newValue", " => ", newValue);

      if (previousValue.status != newValue.status) {

        if (newValue.customerNotification) {
          processProductStatusForCustomer(
            newValue.status,
            newValue.productName,
            newValue.companyId
          );
        }

        if (newValue.supplierNotification) {
          processProductStatusForSupplier(
            newValue.status,
            newValue.productName,
            newValue.companyId
          );
        }
      }
    } catch (error) {
      console.log("Product Update Event error:" + error);
    }
    console.log("Product Update Event Triggered: END");
  });


const processProductStatusForCustomer = async (
  newStatus,
  productName,
  companyId
) => {
  console.log("In processProductStatusForCustomer: START");

  const db = admin.firestore();

  const allDocs = await db
    .collection(PRODUCT_STATUS_COLLECTION)
    .where(STATUS, EQUALS, newStatus)
    .where(ISCUSTOMER, EQUALS, true)
    .get();

  for (doc of allDocs.docs) {
    console.log(doc.id, " => ", doc.data());

    processCompanyRelationForCustomer(newStatus, productName, companyId);

  }

  console.log("In processProductStatusForCustomer: END");
};


const processProductStatusForSupplier = async (
  newStatus,
  productName,
  companyId
) => {
  console.log("In processProductStatusForSupplier: START");

  const db = admin.firestore();

  const allDocs = await db
    .collection(PRODUCT_STATUS_COLLECTION)
    .where(STATUS, EQUALS, newStatus)
    .where(ISSUPPLIER, EQUALS, true)
    .get();

  for (doc of allDocs.docs) {
    console.log(doc.id, " => ", doc.data());

     processCompanyRelationForSupplier(newStatus, productName, companyId);

  }

  console.log("In processProductStatusForSupplier: END");
};

const processCompanyRelationForCustomer = async (
  newStatus,
  productName,
  companyId
) => {
  console.log("In processCompanyRelation: START");

  console.log("Product belongs to companyId = " + companyId);

  const db = admin.firestore();

  const allDocs = await db
    .collection(COMPANY_RELATION_COLLECTION)
    .where(COMPANY_ID, EQUALS, companyId)
    .where(ISCUSTOMER, EQUALS, true)
    .get();

  for (doc of allDocs.docs) {
    console.log(doc.id, " => ", doc.data());

    processCompany(newStatus, productName, doc.data());
  }

  console.log("In processCompanyRelation: END");
};

const processCompanyRelationForSupplier = async (
  newStatus,
  productName,
  companyId
) => {
  console.log("In processCompanyRelationForSupplier: START");

  console.log("Product belongs to companyId = " + companyId);

  const db = admin.firestore();

  const allDocs = await db
    .collection(COMPANY_RELATION_COLLECTION)
    .where(COMPANY_ID, EQUALS, companyId)
    .where(ISSUPPLIER, EQUALS, true)
    .get();

  for (doc of allDocs.docs) {
    console.log(doc.id, " => ", doc.data());

    processCompany(newStatus, productName, doc.data());
  }

  console.log("In processCompanyRelationForSupplier: END");
};

const processCompany = async (newStatus, productName, company_relation) => {
  console.log("In processCompany: START");

  const db = admin.firestore();

  const allDocs = await db
    .collection(COMPANY_COLLECTION)
    .where(COMPANY_ID, EQUALS, company_relation.vendorId)
    .get();

  for (doc of allDocs.docs) {
    console.log(doc.id, " => ", doc.data());

    var message = createStatusChangeMessage(newStatus, productName);

    sendNotification(doc.data().fcmToken, message.title, message.body, doc.data().companyId);
  }
  console.log("In processCompany: END");
};

const createNewProductAddedMessage = (productName) => {
  var title = "New Product Alert !";
  var body = `A new ${productName} has been added, please click to view the details`;

  var myMessage = new Message(title, body);

  return myMessage;
}

//Firebase Functions
exports.createProduct = functions.firestore
  .document("product/{docId}")
  .onCreate((snap, context) => {
    console.log("New Product Added Event Triggered: START");

    const newValue = snap.data();

    const productName = newValue.productName;

    console.log("New productName = " + productName);

    var message = createNewProductAddedMessage(productName);

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

const createStatusChangeMessage = (status, productName) => {
  var title = "";
  var body = "";

  switch (status) {
    case DISCOUNT_STATUS:
      title = "!! HURRY, HURRY, SPECIAL OFFER !!";
      body = `The item ${productName} has special discount, please click to view the details.`;
      break;

    case OUT_OF_STOCK_STATUS:
      title = "Out Of Stock";
      body = `The item ${productName} is out of stock, please click to view the details.`;
      break;

    case NEW_STOCK_STATUS:
      title = "New Stock";
      body = `A new stock of ${productName} has arrived, please click to view the details.`;
      break;

    case BULK_PURCHASE_STATUS:
      title = "Bulk Purchase";
      body = `There is bulk purchase for ${productName}s, please click to view the details.`;
      break;
  }

  var myMessage = new Message(title, body);

  return myMessage;
}

const sendToAll = (title, body) => {

  const db = admin.firestore();

  db.collection("company")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {

        var fcmToken = `${doc.data().fcmToken}`;
        console.log(fcmToken);

        if (fcmToken != null && fcmToken.length > 0) {
          sendNotification(fcmToken, title, body, doc.data().companyId);
        }
      });
    });
}

const sendNotification = async (fcmToken, title, body, companyId) => {

  var message = `Sending notifications to ${companyId}, title = ${title} and body = ${body}`;

  console.log(message);

  try {
    const payload = {
      notification: {
        title: title,
        body: body,
      },
    };

    await admin.messaging().sendToDevice(fcmToken, payload);
  } catch (error) {
    console.log("In sendHttpPushNotification: caught exception " + error);

    return { error: error.code };
  }

  return { success: true };
};
