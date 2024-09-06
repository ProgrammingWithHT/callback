const express = require('express');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const DecryptedPayment = require('./models/decryptedPayment');
require('dotenv').config();
const connectDB = require('./config/db');


const app = express();
const PORT = 5000 || process.env.PORT
connectDB();

app.use(cors({
    origin: '*'
}));

// Decrypt function for callback
const decrypt = (encryptedSecret, salt) => {
    const bytes = CryptoJS.AES.decrypt(encryptedSecret, salt);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// Parse JWT function
const parseJwt = (bearerToken) => {
    if (!bearerToken.startsWith('Bearer ')) {
        console.error('Invalid authorization format');
        return { error: 'Invalid authorization format' };
    }

    const token = bearerToken.slice(7);
    try {
        const decodedToken = jwt.decode(token);
        return decodedToken;
    } catch (error) {
        console.error('Error decoding the token:', error.message);
        return { error: 'Token is not valid' };
    }
};


app.use(express.json({ extended: true }));


app.get("/", (req,res)=>{
    res.json({success: true})
})

app.post("/api/nfg/callback", async (req,res)=>{
    console.log('hi')
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


app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
