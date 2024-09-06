const mongoose = require('mongoose');

const decryptedPaymentSchema = new mongoose.Schema({
    decryptedData: {
        type: mongoose.Schema.Types.Mixed,  // Allows storing any kind of data
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DecryptedPayment', decryptedPaymentSchema);
