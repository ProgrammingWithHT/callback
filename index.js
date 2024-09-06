const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const DecryptedPayment = require('./models/decryptedPayment');
require('dotenv').config();

const PORT = 5000 || process.env.PORT
const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect("mongodb+srv://HamzaTahir:253339808965@ecommerce.sltargt.mongodb.net/nfg-callback", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/", (req,res)=>{
    res.json({success: true})
})

app.post("/api/nfg/callback", async (req,res)=>{
    try {
        console.log(req.body);
        const { body, headers } = req;

        if (headers && headers.authorization && body.data) {
            // Parse JWT token from the authorization header
            const decryptedJwtAuthorization = parseJwt(headers.authorization);
            const { id: walletId, salt, exp } = decryptedJwtAuthorization;

            if (!walletId || !salt || !exp) {
                console.error({ status: 'ERROR', message: 'Token is not valid' });
                return res.status(400).json({ status: 'ERROR', message: 'Invalid token or missing data' });
            }

            try {
                // Decrypt salt using walletId and body data using finalSalt
                const finalSalt = decrypt(salt, walletId);
                const decryptedBody = JSON.parse(decrypt(body.data, finalSalt));

                // Handle the decrypted payment data
                console.log('Decrypted Payment Data:', decryptedBody);

                // Store the entire decrypted body in MongoDB
                const decryptedPayment = new DecryptedPayment({ decryptedData: decryptedBody });
                await decryptedPayment.save();
                

                // Send a success response back to the NFG server
                return res.status(200).json({ status: 'SUCCESS', message: 'Payment processed' });
            } catch (error) {
                console.error('Error decrypting data:', error.message);
                return res.status(500).json({ status: 'ERROR', message: 'Error processing payment' });
            }
        } else {
            return res.status(400).json({ status: 'ERROR', message: 'Missing authorization or body data' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error processing callback' });
    }
})

const db = mongoose.connection;
db.on('error', (error) => console.log('Mongodb error : ', error));
db.once('open', () => {
  console.log('Mongodb connected successfully!');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
});