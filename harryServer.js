const portNumber = 5000;
process.stdin.setEncoding("utf8");
const express = require("express");
const http = require("http");
const httpSuccessStatus = 200;
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config({path: path.resolve(__dirname, ".env")})

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.aspn4k3.mongodb.net/?retryWrites=true`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    const variables = {};
    response.render("index", variables);
});

app.get("/characterPick", (request, response) => {
    const variables = {portnum: portNumber};
    response.render("characterPick", variables);
});


app.post("/pickResp", (request, response) => {
    let variables = {
        msg: ""
    };
    let id;
    let characterSel  = request.body.favChar;
    switch (characterSel) {
        case 'Harry Potter':
            id = '9e3f7ce4-b9a7-4244-b709-dae5c1f1d4a8';
            break;
        case 'Hermione Granger':
            id = '4c7e6819-a91a-45b2-a454-f931e4a7cce3';
            break;
        case 'Ron Weasley':
            id = 'c3b1f9a5-b87b-48bf-b00d-95b093ea6390';
            break;
        case 'Draco Malfoy':
                id = 'af95bd8a-dfae-45bb-bc69-533860d34129';
                break;
        case 'Minerva McGonagall':
            id = 'ca3827f0-375a-4891-aaa5-f5e8a5bad225';
            break;
        case 'Cedric Diggory':
            id = 'd5c4daa3-c726-426a-aa98-fb40f3fba816';
            break;
        case 'Severus Snape':
            id = '3569d265-bd27-44d8-88e8-82fb0a848374';
            break;
        case 'Rubeus Hagrid':
            id = '36bfefd0-e0bb-4d11-be98-d1ef6117a77a';
            break;
        case 'Neville Longbottom':
            id = '3db6dc51-b461-4fa4-a6e4-b1ff352221c5';
            break;
        case 'Albus Dumbledore':
            id = 'b415c867-1cff-455e-b194-748662ac2cca';
            break;        
    }
    let user = {
        user: request.body.userName,
        char: characterSel,
        charId: id  
    };
    lookupApplicant(client, databaseAndCollection, user.user).then((result) => {
        if (result) {
            variables.msg = "User Already Exists."
            response.render("pickResp", variables);
        } else {
            variables.msg = "Data Submitted!"
            addApplicant(client, databaseAndCollection, user);
            response.render("pickResp", variables);
        }
    });
});

app.get("/userLookup", (request, response) => {
    const variables = {portnum: portNumber};
    response.render("userLookup", variables);
});


app.post("/lookupResp", (request, response) => {

    lookupApplicant(client, databaseAndCollection, request.body.username).then((result) => {
        if (result) {
            const apiUrl = `https://hp-api.onrender.com/api/character/${result.charId}`;

            fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
                return response.json();
            }).then(data => {
                data = data[0]
                let nickName = data.alternate_names.join(", "); // data stringify array
                let houseA = data.house;  // data
                let eyeA = data.eyeColour; // data
                let hairA = data.hairColour; // data
                let ancestryA = data.ancestry; // data
                let temp = JSON.stringify(data.wand);
                temp = temp.replace('{', '');
                temp = temp.replace('}', '');
                temp = temp.replace(/"/g, '');
                // temp = temp.replace(/:/g, '→');
                temp = temp.replace(/,/g, ', ');
                let wandA = temp; // data stringify json
                let patronusA = data.patronus; // data
                let dobA = data.dateOfBirth;
                let imageA = data.image;
        
                let variables = {
                    username: result.user,
                    character: result.char,
                    nicknames: nickName,
                    house: houseA,
                    eye: eyeA,
                    hair: hairA,
                    ancestry: ancestryA,
                    wand: wandA,
                    patronus: patronusA,
                    dob: dobA,
                    image: imageA,
    
                };
        
                response.render("lookupResp", variables);// Handle the retrieved data here
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
        } else {
            let variables = {
                msg: ""
            }
            variables.msg = "User doesn't exist"
            response.render("pickResp", variables);
        }
    });
});

app.get("/clear", (request, response) => {
    const variables = {portnum: portNumber};
    response.render("clear", variables);
});

app.post("/clearResp", (request, response) => {
    clearAll(client, databaseAndCollection).then((result) => {
        const variables = {total: result};
        response.render("clearResp", variables);
    });
});

app.listen(portNumber);

console.log(`Web server started and running at http://localhost:${portNumber}`);

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log(`Shutting down the server`);
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
            process.stdout.write(prompt);
        }
        process.stdin.resume();
    }
});

async function addApplicant(client, databaseAndCollection, applicant) {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(applicant);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function lookupApplicant(client, databaseAndCollection, userName) {
    try {
        await client.connect();
        let filter = {user: userName};
        const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .findOne(filter);
       if (result) {
           return result;
       } else {
           return false;
       }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function clearAll(client, databaseAndCollection) {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        return result.deletedCount;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
